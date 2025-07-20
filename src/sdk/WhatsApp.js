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
                await this.connectWithSession(existingSession);
            } else {
                this.logger.info('🔗 Starting new session with QR code');
                await this.connectWithQR();
            }
            
        } catch (error) {
            this.logger.error('Failed to connect:', error);
            this.emit('connection.update', {
                connection: 'close',
                lastDisconnect: { error, date: new Date() }
            });
            throw error;
        }
    }
    
    /**
     * Connect using existing session
     */
    async connectWithSession(session) {
        try {
            // Update components with session credentials
            this.packetBuilder.updateCredentials(session.credentials);
            this.packetParser.updateCredentials(session.credentials);
            
            // Connect to WebSocket
            await this.wsManager.connect();
            
            // Send authentication packet
            const authPacket = this.packetBuilder.buildAuthPacket(session.credentials);
            await this.wsManager.send(authPacket);
            
            this.isAuthenticated = true;
            
        } catch (error) {
            this.logger.error('Failed to connect with session:', error);
            // Fall back to QR connection
            await this.connectWithQR();
        }
    }
    
    /**
     * Connect using QR code
     */
    async connectWithQR() {
        try {
            // Connect to WebSocket
            await this.wsManager.connect();
            
            // Send handshake
            const handshakePacket = this.packetBuilder.buildHandshakePacket();
            await this.wsManager.send(handshakePacket);
            
            // Generate QR code
            await this.qrManager.generateQR({ ref: 'new_session' });
            
        } catch (error) {
            this.logger.error('Failed to connect with QR:', error);
            throw error;
        }
    }
    
    /**
     * Disconnect from WhatsApp
     */
    async disconnect() {
        try {
            this.logger.info('👋 Disconnecting from WhatsApp...');
            
            // Clear QR manager
            this.qrManager.clear();
            
            // Disconnect WebSocket
            this.wsManager.disconnect();
            
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
        return this.messageHandler.sendText(to, text, options);
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
            wsState: this.wsManager.getState(),
            qrStatus: this.qrManager.getStatus(),
            authStatus: this.authManager.getAuthStatus()
        };
    }
    
    /**
     * Logout and clear session
     */
    async logout() {
        try {
            await this.disconnect();
            await this.authManager.logout();
            
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
            await this.authManager.authenticate(credentials);
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
    
    handleError(error, context, retryCount) {
        this.logger.error(`Error in ${context} (retry ${retryCount}):`, error);
        this.emit('error', error);
    }
}