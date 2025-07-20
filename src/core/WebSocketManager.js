/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/Logger.js';
import { errorHandler, ChatPulseError } from '../utils/ErrorHandler.js';
import { WHATSAPP_CONSTANTS, ERROR_CODES } from '../utils/Constants.js';

export class WebSocketManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || WHATSAPP_CONSTANTS.MAX_RECONNECT_ATTEMPTS;
        this.reconnectDelay = options.reconnectDelay || WHATSAPP_CONSTANTS.RECONNECT_DELAY;
        this.pingInterval = options.pingInterval || WHATSAPP_CONSTANTS.PING_INTERVAL;
        this.pingTimer = null;
        this.lastPong = Date.now();
        this.messageQueue = [];
        this.isProcessingQueue = false;
        
        // Bind methods to preserve context
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handlePong = this.handlePong.bind(this);
    }
    
    /**
     * Connect to WhatsApp WebSocket
     */
    async connect(url = WHATSAPP_CONSTANTS.WS_URL, protocols = [], options = {}) {
        if (this.isConnecting || this.isConnected) {
            logger.warn('WebSocket connection already in progress or established');
            return;
        }
        
        this.isConnecting = true;
        logger.info('🔄 Connecting to WhatsApp WebSocket...', { url });
        
        try {
            const wsOptions = {
                origin: WHATSAPP_CONSTANTS.WS_ORIGIN,
                headers: {
                    ...WHATSAPP_CONSTANTS.DEFAULT_HEADERS,
                    ...options.headers
                },
                ...options
            };
            
            this.ws = new WebSocket(url, protocols, wsOptions);
            this.setupEventListeners();
            
            // Wait for connection to be established
            await this.waitForConnection();
            
        } catch (error) {
            this.isConnecting = false;
            throw new ChatPulseError(
                'Failed to establish WebSocket connection',
                ERROR_CODES.CONNECTION_FAILED,
                { url, error: error.message }
            );
        }
    }
    
    /**
     * Wait for WebSocket connection to be established
     */
    waitForConnection(timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new ChatPulseError(
                    'WebSocket connection timeout',
                    ERROR_CODES.CONNECTION_FAILED,
                    { timeout }
                ));
            }, timeout);
            
            const onOpen = () => {
                clearTimeout(timeoutId);
                resolve();
            };
            
            const onError = (error) => {
                clearTimeout(timeoutId);
                reject(error);
            };
            
            this.once('open', onOpen);
            this.once('error', onError);
        });
    }
    
    /**
     * Setup WebSocket event listeners
     */
    setupEventListeners() {
        if (!this.ws) return;
        
        this.ws.on('open', this.handleOpen);
        this.ws.on('message', this.handleMessage);
        this.ws.on('close', this.handleClose);
        this.ws.on('error', this.handleError);
        this.ws.on('pong', this.handlePong);
    }
    
    /**
     * Handle WebSocket open event
     */
    handleOpen() {
        logger.connection('open');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastPong = Date.now();
        
        this.startPingInterval();
        this.processMessageQueue();
        
        this.emit('open');
        this.emit('connection.update', { connection: 'open' });
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(data) {
        try {
            logger.trace('📨 Received WebSocket message', { size: data.length });
            
            // Parse binary or text message
            let parsedData;
            if (Buffer.isBuffer(data)) {
                // Handle binary protocol messages
                parsedData = this.parseBinaryMessage(data);
            } else {
                // Handle text messages (JSON)
                parsedData = JSON.parse(data.toString());
            }
            
            this.emit('message', parsedData);
            
        } catch (error) {
            logger.error('Failed to parse WebSocket message:', error);
            this.emit('error', new ChatPulseError(
                'Failed to parse incoming message',
                ERROR_CODES.INVALID_MESSAGE,
                { error: error.message, dataLength: data.length }
            ));
        }
    }
    
    /**
     * Parse binary WebSocket message
     */
    parseBinaryMessage(data) {
        // WhatsApp uses a custom binary protocol
        // This is a simplified parser - in production, you'd need to implement
        // the full WhatsApp binary protocol specification
        
        if (data.length < 2) {
            throw new Error('Invalid binary message length');
        }
        
        const messageType = data[0];
        const flags = data[1];
        const payload = data.slice(2);
        
        return {
            type: 'binary',
            messageType,
            flags,
            payload: payload.toString('base64'),
            raw: data
        };
    }
    
    /**
     * Handle WebSocket close event
     */
    handleClose(code, reason) {
        logger.connection('close', { code, reason: reason?.toString() });
        
        this.isConnected = false;
        this.isConnecting = false;
        this.stopPingInterval();
        
        this.emit('close', { code, reason });
        this.emit('connection.update', { 
            connection: 'close', 
            lastDisconnect: { error: { output: { statusCode: code } }, date: new Date() }
        });
        
        // Attempt reconnection if not manually closed
        if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
        }
    }
    
    /**
     * Handle WebSocket error event
     */
    handleError(error) {
        logger.error('WebSocket error:', error);
        
        this.emit('error', new ChatPulseError(
            'WebSocket connection error',
            ERROR_CODES.CONNECTION_FAILED,
            { error: error.message }
        ));
    }
    
    /**
     * Handle pong response
     */
    handlePong() {
        this.lastPong = Date.now();
        logger.trace('🏓 Received pong from server');
    }
    
    /**
     * Start ping interval to keep connection alive
     */
    startPingInterval() {
        this.stopPingInterval();
        
        this.pingTimer = setInterval(() => {
            if (this.isConnected && this.ws) {
                const timeSinceLastPong = Date.now() - this.lastPong;
                
                if (timeSinceLastPong > this.pingInterval * 2) {
                    logger.warn('No pong received, connection may be dead');
                    this.disconnect();
                    return;
                }
                
                logger.trace('🏓 Sending ping to server');
                this.ws.ping();
            }
        }, this.pingInterval);
    }
    
    /**
     * Stop ping interval
     */
    stopPingInterval() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
    
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        logger.info(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isConnected && !this.isConnecting) {
                this.emit('connection.update', { connection: 'connecting' });
                this.connect().catch(error => {
                    logger.error('Reconnection failed:', error);
                });
            }
        }, delay);
    }
    
    /**
     * Send message through WebSocket
     */
    async send(data) {
        if (!this.isConnected || !this.ws) {
            // Queue message for later sending
            this.messageQueue.push(data);
            logger.debug('Message queued (not connected)', { queueSize: this.messageQueue.length });
            return;
        }
        
        try {
            let payload;
            
            if (typeof data === 'string') {
                payload = data;
            } else if (Buffer.isBuffer(data)) {
                payload = data;
            } else {
                payload = JSON.stringify(data);
            }
            
            this.ws.send(payload);
            logger.trace('📤 Sent WebSocket message', { size: payload.length });
            
        } catch (error) {
            throw new ChatPulseError(
                'Failed to send WebSocket message',
                ERROR_CODES.NETWORK_ERROR,
                { error: error.message }
            );
        }
    }
    
    /**
     * Process queued messages
     */
    async processMessageQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        logger.debug(`Processing ${this.messageQueue.length} queued messages`);
        
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            try {
                await this.send(message);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between messages
            } catch (error) {
                logger.error('Failed to send queued message:', error);
                // Re-queue the message
                this.messageQueue.unshift(message);
                break;
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    /**
     * Disconnect WebSocket
     */
    disconnect() {
        logger.info('🔌 Disconnecting WebSocket...');
        
        this.stopPingInterval();
        
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, 'Manual disconnect');
            }
            this.ws = null;
        }
        
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    }
    
    /**
     * Get connection state
     */
    getState() {
        if (!this.ws) return 'closed';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'connecting';
            case WebSocket.OPEN:
                return 'open';
            case WebSocket.CLOSING:
                return 'closing';
            case WebSocket.CLOSED:
                return 'closed';
            default:
                return 'unknown';
        }
    }
    
    /**
     * Check if WebSocket is ready to send messages
     */
    isReady() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}