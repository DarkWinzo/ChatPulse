/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/Logger.js';
import { CryptoUtil } from '../utils/CryptoUtil.js';
import { errorHandler, ChatPulseError } from '../utils/ErrorHandler.js';
import { ERROR_CODES } from '../utils/Constants.js';

export class PacketParser extends EventEmitter {
    constructor(credentials = null) {
        super();
        this.credentials = credentials;
        this.messageHandlers = new Map();
        this.setupDefaultHandlers();
    }
    
    /**
     * Setup default message handlers
     */
    setupDefaultHandlers() {
        this.messageHandlers.set('handshake_response', this.handleHandshakeResponse.bind(this));
        this.messageHandlers.set('auth_response', this.handleAuthResponse.bind(this));
        this.messageHandlers.set('message', this.handleMessage.bind(this));
        this.messageHandlers.set('presence', this.handlePresence.bind(this));
        this.messageHandlers.set('reaction', this.handleReaction.bind(this));
        this.messageHandlers.set('group_update', this.handleGroupUpdate.bind(this));
        this.messageHandlers.set('media_upload_response', this.handleMediaUploadResponse.bind(this));
        this.messageHandlers.set('ping', this.handlePing.bind(this));
        this.messageHandlers.set('pong', this.handlePong.bind(this));
        this.messageHandlers.set('error', this.handleError.bind(this));
        this.messageHandlers.set('qr_update', this.handleQRUpdate.bind(this));
        this.messageHandlers.set('connection_update', this.handleConnectionUpdate.bind(this));
    }
    
    /**
     * Parse incoming packet
     */
    async parsePacket(data) {
        try {
            let packet;
            
            // Handle different data types
            if (Buffer.isBuffer(data)) {
                packet = this.parseBinaryPacket(data);
            } else if (typeof data === 'string') {
                packet = JSON.parse(data);
            } else if (typeof data === 'object') {
                packet = data;
            } else {
                throw new Error('Unsupported packet data type');
            }
            
            logger.trace('📨 Parsing packet', { type: packet.type });
            
            // Validate packet
            if (!this.validatePacket(packet)) {
                throw new ChatPulseError(
                    'Invalid packet format',
                    ERROR_CODES.INVALID_MESSAGE,
                    { packet }
                );
            }
            
            // Decrypt if encrypted
            if (packet.type === 'encrypted') {
                packet = this.decryptPacket(packet);
            }
            
            // Verify signature if present
            if (packet.signature && !this.verifySignature(packet)) {
                logger.warn('Packet signature verification failed');
            }
            
            // Route to appropriate handler
            await this.routePacket(packet);
            
            return packet;
            
        } catch (error) {
            logger.error('Failed to parse packet:', error);
            this.emit('error', errorHandler.createError(error, 'packet parsing'));
            return null;
        }
    }
    
    /**
     * Parse binary packet
     */
    parseBinaryPacket(data) {
        try {
            if (data.length < 4) {
                throw new Error('Binary packet too short');
            }
            
            const packetType = data.readUInt8(0);
            const flags = data.readUInt8(1);
            const length = data.readUInt16BE(2);
            const payload = data.slice(4);
            
            if (payload.length !== length) {
                throw new Error('Binary packet length mismatch');
            }
            
            // Handle different binary packet types
            switch (packetType) {
                case 0x01: // Text message
                    return {
                        type: 'binary_message',
                        packetType,
                        flags,
                        content: payload.toString('utf8'),
                        raw: data
                    };
                    
                case 0x02: // Media message
                    return {
                        type: 'binary_media',
                        packetType,
                        flags,
                        content: payload,
                        raw: data
                    };
                    
                case 0x03: // Control message
                    return {
                        type: 'binary_control',
                        packetType,
                        flags,
                        content: this.parseControlPayload(payload),
                        raw: data
                    };
                    
                default:
                    return {
                        type: 'binary_unknown',
                        packetType,
                        flags,
                        content: payload,
                        raw: data
                    };
            }
            
        } catch (error) {
            logger.error('Failed to parse binary packet:', error);
            return {
                type: 'binary_error',
                error: error.message,
                raw: data
            };
        }
    }
    
    /**
     * Parse control payload from binary packet
     */
    parseControlPayload(payload) {
        try {
            // Control messages are usually JSON
            return JSON.parse(payload.toString('utf8'));
        } catch (error) {
            // If not JSON, return as base64
            return {
                type: 'raw_control',
                data: payload.toString('base64')
            };
        }
    }
    
    /**
     * Validate packet structure
     */
    validatePacket(packet) {
        if (!packet || typeof packet !== 'object') {
            return false;
        }
        
        // Must have a type
        if (!packet.type || typeof packet.type !== 'string') {
            return false;
        }
        
        // Must have timestamp for most packets
        if (!packet.timestamp && !['ping', 'pong', 'binary_unknown'].includes(packet.type)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Decrypt encrypted packet
     */
    decryptPacket(encryptedPacket) {
        try {
            if (!this.credentials?.secretKey) {
                throw new Error('No secret key available for decryption');
            }
            
            const decrypted = CryptoUtil.aesDecrypt(encryptedPacket.data, this.credentials.secretKey);
            return JSON.parse(decrypted);
            
        } catch (error) {
            logger.error('Failed to decrypt packet:', error);
            return encryptedPacket;
        }
    }
    
    /**
     * Verify packet signature
     */
    verifySignature(packet) {
        try {
            if (!this.credentials?.secretKey || !packet.signature) {
                return false;
            }
            
            const { signature, ...packetWithoutSignature } = packet;
            const packetString = JSON.stringify(packetWithoutSignature, Object.keys(packetWithoutSignature).sort());
            
            return CryptoUtil.validateSignature(packetString, signature, this.credentials.secretKey);
            
        } catch (error) {
            logger.error('Failed to verify signature:', error);
            return false;
        }
    }
    
    /**
     * Route packet to appropriate handler
     */
    async routePacket(packet) {
        const handler = this.messageHandlers.get(packet.type);
        
        if (handler) {
            try {
                await handler(packet);
            } catch (error) {
                logger.error(`Handler error for packet type ${packet.type}:`, error);
                this.emit('error', error);
            }
        } else {
            logger.debug(`No handler for packet type: ${packet.type}`);
            this.emit('unknown_packet', packet);
        }
    }
    
    /**
     * Handle handshake response
     */
    async handleHandshakeResponse(packet) {
        logger.info('🤝 Received handshake response');
        this.emit('handshake.response', packet);
    }
    
    /**
     * Handle authentication response
     */
    async handleAuthResponse(packet) {
        if (packet.success) {
            logger.info('✅ Authentication successful');
            this.emit('auth.success', packet);
        } else {
            logger.error('❌ Authentication failed:', packet.error);
            this.emit('auth.failed', packet);
        }
    }
    
    /**
     * Handle incoming message
     */
    async handleMessage(packet) {
        logger.message(packet.from || 'unknown', packet.messageType || 'unknown', packet.content);
        
        const messageData = {
            messageId: packet.messageId,
            from: packet.from,
            to: packet.to,
            messageType: packet.messageType || 'conversation',
            content: packet.content,
            timestamp: packet.timestamp,
            isGroup: packet.isGroup || false,
            participant: packet.participant || null
        };
        
        this.emit('messages.upsert', {
            messages: [messageData],
            type: 'notify'
        });
    }
    
    /**
     * Handle presence update
     */
    async handlePresence(packet) {
        logger.debug(`👤 Presence update: ${packet.from} is ${packet.presence}`);
        
        this.emit('presence.update', {
            id: packet.from,
            presences: {
                [packet.from]: {
                    lastKnownPresence: packet.presence,
                    lastSeen: packet.timestamp
                }
            }
        });
    }
    
    /**
     * Handle reaction
     */
    async handleReaction(packet) {
        logger.debug(`👍 Reaction: ${packet.reaction} on message ${packet.messageId}`);
        
        this.emit('messages.reaction', {
            key: {
                id: packet.messageId,
                remoteJid: packet.chatId,
                fromMe: packet.from === this.credentials?.clientId
            },
            reaction: {
                text: packet.reaction,
                senderTimestampMs: packet.timestamp
            }
        });
    }
    
    /**
     * Handle group update
     */
    async handleGroupUpdate(packet) {
        logger.debug(`👥 Group update: ${packet.action} in ${packet.groupId}`);
        
        this.emit('groups.update', {
            id: packet.groupId,
            action: packet.action,
            participants: packet.participants || [],
            timestamp: packet.timestamp
        });
    }
    
    /**
     * Handle media upload response
     */
    async handleMediaUploadResponse(packet) {
        logger.debug(`📎 Media upload response: ${packet.uploadId}`);
        
        this.emit('media.upload.response', {
            uploadId: packet.uploadId,
            success: packet.success,
            url: packet.url,
            error: packet.error
        });
    }
    
    /**
     * Handle ping
     */
    async handlePing(packet) {
        logger.trace('🏓 Received ping');
        this.emit('ping', packet);
    }
    
    /**
     * Handle pong
     */
    async handlePong(packet) {
        logger.trace('🏓 Received pong');
        this.emit('pong', packet);
    }
    
    /**
     * Handle error packet
     */
    async handleError(packet) {
        logger.error('❌ Received error packet:', packet);
        
        const error = new ChatPulseError(
            packet.message || 'Server error',
            packet.code || ERROR_CODES.NETWORK_ERROR,
            packet
        );
        
        this.emit('error', error);
    }
    
    /**
     * Handle QR update
     */
    async handleQRUpdate(packet) {
        logger.qr(packet.qr || 'QR updated');
        this.emit('qr', packet.qr);
    }
    
    /**
     * Handle connection update
     */
    async handleConnectionUpdate(packet) {
        logger.connection(packet.connection, packet.reason);
        this.emit('connection.update', packet);
    }
    
    /**
     * Add custom message handler
     */
    addHandler(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
        logger.debug(`Added custom handler for message type: ${messageType}`);
    }
    
    /**
     * Remove message handler
     */
    removeHandler(messageType) {
        this.messageHandlers.delete(messageType);
        logger.debug(`Removed handler for message type: ${messageType}`);
    }
    
    /**
     * Update credentials
     */
    updateCredentials(credentials) {
        this.credentials = credentials;
        logger.debug('📨 PacketParser credentials updated');
    }
    
    /**
     * Get parser statistics
     */
    getStats() {
        return {
            handlerCount: this.messageHandlers.size,
            hasCredentials: !!this.credentials
        };
    }
}