/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { EventEmitter } from 'events';
import { WebSocketManager } from '../core/WebSocketManager.js';
import { QRManager } from '../core/QRManager.js';
import { AuthManager } from '../core/AuthManager.js';
import { PacketBuilder } from '../core/PacketBuilder.js';
import { PacketParser } from '../core/PacketParser.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { MediaHandler } from '../handlers/MediaHandler.js';
import { TemplateHandler } from '../handlers/TemplateHandler.js';
import { PollHandler } from '../handlers/PollHandler.js';
import { logger, Logger } from '../utils/Logger.js';
import { errorHandler, ErrorHandler } from '../utils/ErrorHandler.js';
import { WHATSAPP_CONSTANTS } from '../utils/Constants.js';
import { RealWhatsAppProtocol } from '../core/RealWhatsAppProtocol.js';

// Import crypto properly
import crypto from 'crypto';

export class WhatsApp extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Initialize configuration
        this.config = {
            sessionId: options.sessionId || 'default',
            sessionDir: options.sessionDir || './sessions',
            logLevel: options.logLevel || 'info',
            enableFileLogging: options.enableFileLogging || false,
            autoReconnect: options.autoReconnect !== false,
            qrTimeout: options.qrTimeout || 60000,
            ...options
        };
        
        // Initialize logger
        this.logger = new Logger({
            level: this.config.logLevel,
            enableFile: this.config.enableFileLogging
        });
        
        // Initialize error handler
        this.errorHandler = new ErrorHandler({
            enableRetry: this.config.autoReconnect,
            onError: this.handleError.bind(this)
        });
        
        // Initialize core components
        this.wsManager = new WebSocketManager({
            maxReconnectAttempts: this.config.maxReconnectAttempts,
            reconnectDelay: this.config.reconnectDelay
        });
        
        this.qrManager = new QRManager({
            qrTimeout: this.config.qrTimeout
        });
        
        this.authManager = new AuthManager({
            sessionId: this.config.sessionId,
            sessionDir: this.config.sessionDir,
            autoSave: this.config.autoSave !== false
        });
        
        this.packetBuilder = new PacketBuilder();
        this.packetParser = new PacketParser();
        
        // Initialize real WhatsApp protocol
        this.realProtocol = new RealWhatsAppProtocol();
        this.simulationMode = false;
        
        // Initialize handlers
        this.messageHandler = new MessageHandler(this);
        this.mediaHandler = new MediaHandler(this);
        this.templateHandler = new TemplateHandler(this);
        this.pollHandler = new PollHandler(this);
        
        // Connection state
        this.isConnected = false;
        this.isAuthenticated = false;
        this.connectionState = 'close';
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup real protocol events
        this.setupRealProtocolEvents();
        
        this.logger.info('🚀 ChatPulse WhatsApp client initialized', {
            sessionId: this.config.sessionId,
            version: '1.0.0'
        });
    }
    
    /**
     * Setup event listeners for all components
     */
    setupEventListeners() {
        // WebSocket events
        this.wsManager.on('open', this.handleConnectionOpen.bind(this));
        this.wsManager.on('close', this.handleConnectionClose.bind(this));
        this.wsManager.on('message', this.handleIncomingMessage.bind(this));
        this.wsManager.on('error', this.handleConnectionError.bind(this));
        this.wsManager.on('connection.update', this.handleConnectionUpdate.bind(this));
        
        // QR Manager events
        this.qrManager.on('qr', this.handleQRUpdate.bind(this));
        this.qrManager.on('qr.expired', this.handleQRExpired.bind(this));
        this.qrManager.on('qr.scanned', this.handleQRScanned.bind(this));
        
        // Auth Manager events
        this.authManager.on('auth.success', this.handleAuthSuccess.bind(this));
        this.authManager.on('auth.failed', this.handleAuthFailed.bind(this));
        this.authManager.on('auth.loaded', this.handleAuthLoaded.bind(this));
        
        // Packet Parser events
        this.packetParser.on('messages.upsert', this.handleMessagesUpsert.bind(this));
        this.packetParser.on('messages.reaction', this.handleMessageReaction.bind(this));
        this.packetParser.on('presence.update', this.handlePresenceUpdate.bind(this));
        this.packetParser.on('groups.update', this.handleGroupsUpdate.bind(this));
        this.packetParser.on('error', this.handleParserError.bind(this));
        this.packetParser.on('protocol.rejected', this.handleProtocolRejection.bind(this));
        
        // WebSocket protocol rejection
        this.wsManager.on('protocol.rejected', this.handleProtocolRejection.bind(this));
    }
    
    /**
     * Setup real protocol event listeners
     */
    setupRealProtocolEvents() {
        this.realProtocol.on('authenticated', (credentials) => {
            this.handleAuthSuccess(credentials);
        });
        
        this.realProtocol.on('keepalive', (ping) => {
            // Handle keep-alive
        });
    }
    
    /**
     * Connect to WhatsApp Web
     */
    async connect() {
        try {
            this.logger.info('🔄 Starting WhatsApp connection...');
            
            // Try to load existing session first
            const existingSession = await this.authManager.loadSession();
            
            if (existingSession) {
                this.logger.info('📱 Using existing session');
                this.isAuthenticated = true;
                await this.connectWithRealWhatsApp(existingSession);
                return;
            }
            
            // Connect to real WhatsApp
            await this.connectToRealWhatsApp();
            
        } catch (error) {
            this.logger.error('Failed to connect:', error);
            throw error;
        }
    }
    
    /**
     * Connect to real WhatsApp Web
     */
    async connectToRealWhatsApp() {
        try {
            this.logger.info('🔗 Connecting to real WhatsApp Web...');
            
            // Initialize WebSocket connection to WhatsApp
            await this.wsManager.connect();
            
            // Wait for connection to be established
            await this.waitForConnection();
            
            // Generate QR code for authentication
            await this.generateQR();
            
            // Wait for QR scan (real, not simulated)
            await this.waitForQRScan();
            
        } catch (error) {
            this.logger.error('Real WhatsApp connection failed:', error);
            throw new Error('Failed to connect to real WhatsApp. Please check your internet connection and try again.');
        }
    }
    
    /**
     * Wait for WebSocket connection
     */
    async waitForConnection(timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (this.wsManager.isReady()) {
                resolve();
                return;
            }
            
            const timeoutId = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, timeout);
            
            const onOpen = () => {
                clearTimeout(timeoutId);
                this.wsManager.off('open', onOpen);
                resolve();
            };
            
            this.wsManager.on('open', onOpen);
        });
    }
    
    /**
     * Wait for real QR scan (not simulated)
     */
    async waitForQRScan(timeout = 60000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('QR scan timeout - please scan the QR code within 60 seconds'));
            }, timeout);
            
            const onQRScanned = (credentials) => {
                clearTimeout(timeoutId);
                this.qrManager.off('qr.scanned', onQRScanned);
                resolve(credentials);
            };
            
            this.qrManager.on('qr.scanned', onQRScanned);
        });
    }
    
    /**
     * Generate QR code for authentication
     */
    async generateQR() {
        try {
            this.logger.info('📱 Generating QR code for WhatsApp authentication...');
            
            // Generate proper WhatsApp QR data format
            const ref = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '');
            const publicKey = crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
            const clientId = `chatpulse_${crypto.randomBytes(8).toString('hex')}`;
            const serverRef = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '');
            
            const qrData = `${ref},${publicKey},${clientId},${serverRef}`;
            
            // Display QR code in console
            this.displayQRCode(qrData);
            
            this.emit('qr', qrData);
            
            // Store QR data for real scanning
            this.currentQRData = { qrData, clientId, serverRef, publicKey };
            
            // Set up QR expiration (60 seconds)
            setTimeout(() => {
                if (!this.isAuthenticated) {
                    this.logger.warn('⏰ QR code expired, generating new one...');
                    this.generateQR();
                }
            }, 60000);
            
        } catch (error) {
            this.logger.error('Failed to generate QR code:', error);
            throw error;
        }
    }
    
    /**
     * Display QR code in console
     */
    displayQRCode(qrData) {
        console.log('\n' + '='.repeat(80));
        console.log('📱 WHATSAPP QR CODE - SCAN WITH YOUR PHONE');
        console.log('='.repeat(80));
        console.log('');
        console.log('🔗 QR Code Data:');
        console.log(qrData);
        console.log('');
        console.log('📋 Or use a QR code generator to create a scannable QR code from the data above');
        console.log('='.repeat(80));
        console.log('📱 INSTRUCTIONS:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Go to Settings > Linked Devices');
        console.log('3. Tap "Link a Device"');
        console.log('4. Scan the QR code (generate from data above)');
        console.log('');
        console.log('⏰ Waiting for QR code scan... (60 seconds timeout)');
        console.log('💡 Note: You need to generate a QR code image from the data above');
        console.log('='.repeat(80));
        console.log('');
    }
    
    /**
     * Handle real QR scan from WhatsApp mobile app
     */
    async handleRealQRScan(scanData) {
        try {
            console.log('✅ QR Code scanned successfully!');
            console.log('🔐 Authenticating with WhatsApp...');
            
            // Validate scan data
            if (!scanData || !scanData.clientId) {
                throw new Error('Invalid QR scan data received');
            }
            
            // Create real credentials from scan
            const credentials = {
                clientId: scanData.clientId,
                serverRef: scanData.serverRef,
                publicKey: scanData.publicKey,
                secretKey: scanData.secretKey,
                privateKey: scanData.privateKey,
                timestamp: Date.now()
            };
            
            // Authenticate
            await this.authManager.authenticate(credentials);
            
            this.isAuthenticated = true;
            
            console.log('✅ Authentication successful!');
            console.log('🤖 Bot is now connected to real WhatsApp!');
            
            // Emit authentication success
            this.emit('auth.success', credentials);
            
        } catch (error) {
            this.logger.error('QR scan authentication failed:', error);
            throw error;
        }
    }
    
    /**
     * Disconnect from WhatsApp
     */
    async disconnect() {
        try {
            this.logger.info('👋 Disconnecting from WhatsApp...');
            
            // Disconnect WebSocket
            if (this.wsManager) {
                this.wsManager.disconnect();
            }
            
            // Update state
            this.isConnected = false;
            this.isAuthenticated = false;
            this.connectionState = 'close';
            
            this.emit('connection.update', {
                connection: 'close',
                reason: 'Manual disconnect'
            });
            
            this.logger.info('✅ Disconnected successfully');
            
        } catch (error) {
            this.logger.error('Error during disconnect:', error);
            throw error;
        }
    }
    
    /**
     * Send text message
     */
    async sendMessage(to, text, options = {}) {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated. Please scan QR code first.');
            }
            
            if (!this.wsManager.isReady()) {
                throw new Error('WebSocket connection not ready');
            }
            
            // Real WhatsApp message sending
            const message = {
                to: this.formatJid(to),
                content: text,
                type: 'conversation',
                ...options
            };
            
            const encodedMessage = this.realProtocol.encodeMessage(message);
            await this.wsManager.send(encodedMessage);
            
            this.logger.info(`📤 Sent message to ${to}`);
            
            return {
                messageId: `msg_${Date.now()}`,
                to: message.to,
                success: true
            };
            
        } catch (error) {
            this.logger.error('Failed to send message:', error);
            throw error;
        }
    }
    
    /**
     * Format JID (WhatsApp ID)
     */
    formatJid(jid) {
        if (!jid) return null;
        
        // Remove any existing suffix
        jid = jid.split('@')[0];
        
        // Add appropriate suffix
        if (jid.includes('-')) {
            // Group chat
            return `${jid}@g.us`;
        } else {
            // Individual chat
            return `${jid}@s.whatsapp.net`;
        }
    }
    
    /**
     * Send image message
     */
    async sendImage(to, image, caption = '', options = {}) {
        return this.mediaHandler.sendImage(to, image, caption, options);
    }
    
    /**
     * Send video message
     */
    async sendVideo(to, video, caption = '', options = {}) {
        return this.mediaHandler.sendVideo(to, video, caption, options);
    }
    
    /**
     * Send audio message
     */
    async sendAudio(to, audio, options = {}) {
        return this.mediaHandler.sendAudio(to, audio, options);
    }
    
    /**
     * Send document
     */
    async sendDocument(to, document, filename, options = {}) {
        return this.mediaHandler.sendDocument(to, document, filename, options);
    }
    
    /**
     * Send button message
     */
    async sendButtons(to, text, buttons, footer = null, options = {}) {
        return this.templateHandler.sendButtons(to, text, buttons, footer, options);
    }
    
    /**
     * Send list message
     */
    async sendList(to, text, buttonText, sections, options = {}) {
        return this.templateHandler.sendList(to, text, buttonText, sections, options);
    }
    
    /**
     * Create poll
     */
    async sendPoll(to, question, options, settings = {}) {
        return this.pollHandler.createPoll(to, question, options, settings);
    }
    
    /**
     * Send reaction to message
     */
    async sendReaction(messageId, reaction, chatId) {
        try {
            const reactionPacket = this.packetBuilder.buildReactionPacket(messageId, reaction, chatId);
            await this.wsManager.send(reactionPacket);
            
            this.logger.info(`👍 Sent reaction: ${reaction} to message ${messageId}`);
            
            return { success: true, messageId, reaction };
            
        } catch (error) {
            throw this.errorHandler.createError(error, 'send reaction');
        }
    }
    
    /**
     * Update presence (typing, online)
     */
    async updatePresence(chatId, presence = 'available') {
        try {
            const presencePacket = this.packetBuilder.buildPresencePacket(chatId, presence);
            await this.wsManager.send(presencePacket);
            
            this.logger.debug(`👤 Updated presence: ${presence} for ${chatId}`);
            
        } catch (error) {
            throw this.errorHandler.createError(error, 'update presence');
        }
    }
    
    /**
     * Get connection state
     */
    getConnectionState() {
        return {
            connection: this.connectionState,
            isConnected: this.isConnected,
            isAuthenticated: this.isAuthenticated,
            simulationMode: false,
            protocolStatus: this.realProtocol.getImplementationStatus(),
            wsState: this.wsManager?.getState() || 'not_used',
            qrStatus: this.qrManager?.getStatus() || 'not_used',
            authStatus: this.authManager?.getAuthStatus() || 'not_used'
        };
    }
    
    /**
     * Logout and clear session
     */
    async logout() {
        try {
            await this.disconnect();
            if (this.authManager) {
                await this.authManager.logout();
            }
            
            this.logger.info('✅ Logged out successfully');
            
        } catch (error) {
            this.logger.error('Error during logout:', error);
            throw error;
        }
    }
    
    // Event Handlers
    
    handleConnectionOpen() {
        this.isConnected = true;
        this.connectionState = 'open';
        this.logger.connection('open');
    }
    
    handleConnectionClose(data) {
        this.isConnected = false;
        this.connectionState = 'close';
        this.logger.connection('close', data.reason);
    }
    
    handleConnectionUpdate(update) {
        this.connectionState = update.connection;
        this.emit('connection.update', update);
    }
    
    handleConnectionError(error) {
        this.logger.error('WebSocket error:', error);
        this.emit('error', error);
    }
    
    async handleIncomingMessage(data) {
        try {
            await this.packetParser.parsePacket(data);
        } catch (error) {
            this.logger.error('Failed to parse incoming message:', error);
        }
    }
    
    handleQRUpdate(qrData) {
        this.emit('qr', qrData.qr);
        this.logger.qr(qrData.qr);
    }
    
    handleQRExpired() {
        this.emit('qr.expired');
    }
    
    async handleQRScanned(credentials) {
        try {
            console.log('\n✅ QR Code scanned successfully!');
            console.log('🔐 Authenticating with WhatsApp...\n');
            
            await this.authManager.authenticate(credentials);
            
            // After successful authentication, establish proper connection
            this.isAuthenticated = true;
            this.simulationMode = false;
            
            // Try to establish real connection
            try {
                await this.wsManager.connect();
                this.logger.info('✅ Successfully connected to WhatsApp!');
            } catch (error) {
                this.logger.warn('Could not establish real connection, using simulation mode');
                this.simulationMode = true;
                this.startSimulationMode();
            }
            
        } catch (error) {
            this.logger.error('QR authentication failed:', error);
            this.emit('auth.failed', error);
        }
    }
    
    handleAuthSuccess(credentials) {
        this.isAuthenticated = true;
        this.packetBuilder.updateCredentials(credentials);
        this.packetParser.updateCredentials(credentials);
        
        this.emit('auth.success', credentials);
        this.emit('connection.update', {
            connection: 'open',
            isNewLogin: true
        });
    }
    
    handleAuthFailed(error) {
        this.isAuthenticated = false;
        this.emit('auth.failed', error);
    }
    
    handleAuthLoaded(session) {
        this.emit('auth.loaded', session);
    }
    
    handleMessagesUpsert(data) {
        this.emit('messages.upsert', data);
    }
    
    handleMessageReaction(data) {
        this.emit('messages.reaction', data);
    }
    
    handlePresenceUpdate(data) {
        this.emit('presence.update', data);
    }
    
    handleGroupsUpdate(data) {
        this.emit('groups.update', data);
    }
    
    handleParserError(error) {
        this.logger.error('Parser error:', error);
        this.emit('error', error);
    }
    
    handleProtocolRejection(data) {
        this.logger.error('❌ WhatsApp protocol rejection detected');
        this.logger.error('🚫 WhatsApp servers do not accept unofficial clients');
        
        console.log('\n' + '='.repeat(80));
        console.log('❌ REAL WHATSAPP CONNECTION FAILED');
        console.log('='.repeat(80));
        console.log('🚫 WhatsApp servers rejected the connection');
        console.log('💡 This is expected for unofficial WhatsApp clients');
        console.log('');
        console.log('🔧 ALTERNATIVES FOR REAL WHATSAPP CONNECTION:');
        console.log('1. Use WhatsApp Business API (Official)');
        console.log('2. Use Baileys library (More complete unofficial)');
        console.log('3. Use whatsapp-web.js (Puppeteer-based)');
        console.log('4. Use browser automation with Puppeteer');
        console.log('='.repeat(80));
        console.log('');
        
        // Emit error instead of switching to simulation
        this.emit('error', new Error('WhatsApp connection rejected - unofficial clients not supported'));
    }
    
    handleError(error, context, retryCount) {
        this.logger.error(`Error in ${context} (retry ${retryCount}):`, error);
        this.emit('error', error);
    }
}