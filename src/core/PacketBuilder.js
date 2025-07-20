/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { CryptoUtil } from '../utils/CryptoUtil.js';
import { logger } from '../utils/Logger.js';
import { WHATSAPP_CONSTANTS } from '../utils/Constants.js';

export class PacketBuilder {
    constructor(credentials = null) {
        this.credentials = credentials;
        this.messageCounter = 0;
    }
    
    /**
     * Build handshake packet for initial connection
     */
    buildHandshakePacket() {
        const packet = {
            type: 'handshake',
            version: WHATSAPP_CONSTANTS.WA_VERSION,
            browser: WHATSAPP_CONSTANTS.BROWSER_VERSION,
            timestamp: Date.now(),
            clientId: this.credentials?.clientId || CryptoUtil.generateClientId()
        };
        
        logger.trace('📦 Built handshake packet', packet);
        return JSON.stringify(packet);
    }
    
    /**
     * Build authentication packet
     */
    buildAuthPacket(authData) {
        const packet = {
            type: 'auth',
            clientId: authData.clientId,
            serverRef: authData.serverRef,
            publicKey: authData.publicKey,
            timestamp: Date.now(),
            signature: this.generateSignature(authData)
        };
        
        logger.trace('📦 Built auth packet');
        return JSON.stringify(packet);
    }
    
    /**
     * Build message packet
     */
    buildMessagePacket(to, content, messageType = 'conversation') {
        const messageId = CryptoUtil.generateMessageId();
        this.messageCounter++;
        
        const packet = {
            type: 'message',
            messageId,
            to,
            messageType,
            content,
            timestamp: Date.now(),
            counter: this.messageCounter
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built message packet', { messageId, to, messageType });
        return JSON.stringify(packet);
    }
    
    /**
     * Build presence packet (typing, online status)
     */
    buildPresencePacket(chatId, presence = 'available') {
        const packet = {
            type: 'presence',
            chatId,
            presence,
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built presence packet', { chatId, presence });
        return JSON.stringify(packet);
    }
    
    /**
     * Build media upload packet
     */
    buildMediaUploadPacket(mediaData, mediaType) {
        const uploadId = CryptoUtil.generateMessageId();
        
        const packet = {
            type: 'media_upload',
            uploadId,
            mediaType,
            size: mediaData.length,
            hash: CryptoUtil.sha256(mediaData).toString('hex'),
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built media upload packet', { uploadId, mediaType, size: mediaData.length });
        return JSON.stringify(packet);
    }
    
    /**
     * Build reaction packet
     */
    buildReactionPacket(messageId, reaction, chatId) {
        const packet = {
            type: 'reaction',
            messageId,
            reaction,
            chatId,
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built reaction packet', { messageId, reaction, chatId });
        return JSON.stringify(packet);
    }
    
    /**
     * Build group action packet
     */
    buildGroupActionPacket(groupId, action, participants = []) {
        const packet = {
            type: 'group_action',
            groupId,
            action,
            participants,
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built group action packet', { groupId, action, participants });
        return JSON.stringify(packet);
    }
    
    /**
     * Build poll creation packet
     */
    buildPollPacket(chatId, question, options, settings = {}) {
        const pollId = CryptoUtil.generateMessageId();
        
        const packet = {
            type: 'poll_create',
            pollId,
            chatId,
            question,
            options: options.map((option, index) => ({
                id: index,
                text: option,
                votes: 0
            })),
            settings: {
                multipleChoice: settings.multipleChoice || false,
                anonymous: settings.anonymous !== false,
                ...settings
            },
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built poll packet', { pollId, chatId, question });
        return JSON.stringify(packet);
    }
    
    /**
     * Build poll vote packet
     */
    buildPollVotePacket(pollId, optionIds, voterId) {
        const packet = {
            type: 'poll_vote',
            pollId,
            optionIds,
            voterId,
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built poll vote packet', { pollId, optionIds, voterId });
        return JSON.stringify(packet);
    }
    
    /**
     * Build close poll packet
     */
    buildClosePollPacket(pollId) {
        const packet = {
            type: 'close_poll',
            pollId,
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built close poll packet', { pollId });
        return JSON.stringify(packet);
    }
    
    /**
     * Build button message packet
     */
    buildButtonMessagePacket(chatId, text, buttons, footer = null) {
        const messageId = CryptoUtil.generateMessageId();
        
        const packet = {
            type: 'button_message',
            messageId,
            chatId,
            content: {
                text,
                buttons: buttons.map((button, index) => ({
                    id: button.id || `btn_${index}`,
                    text: button.text,
                    type: button.type || 'reply'
                })),
                footer
            },
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built button message packet', { messageId, chatId, buttonCount: buttons.length });
        return JSON.stringify(packet);
    }
    
    /**
     * Build list message packet
     */
    buildListMessagePacket(chatId, text, buttonText, sections) {
        const messageId = CryptoUtil.generateMessageId();
        
        const packet = {
            type: 'list_message',
            messageId,
            chatId,
            content: {
                text,
                buttonText,
                sections: sections.map(section => ({
                    title: section.title,
                    rows: section.rows.map((row, index) => ({
                        id: row.id || `row_${index}`,
                        title: row.title,
                        description: row.description || null
                    }))
                }))
            },
            timestamp: Date.now()
        };
        
        if (this.credentials) {
            packet.from = this.credentials.clientId;
            packet.signature = this.signPacket(packet);
        }
        
        logger.trace('📦 Built list message packet', { messageId, chatId, sectionCount: sections.length });
        return JSON.stringify(packet);
    }
    
    /**
     * Build ping packet for keep-alive
     */
    buildPingPacket() {
        const packet = {
            type: 'ping',
            timestamp: Date.now()
        };
        
        logger.trace('📦 Built ping packet');
        return JSON.stringify(packet);
    }
    
    /**
     * Build pong response packet
     */
    buildPongPacket(pingTimestamp) {
        const packet = {
            type: 'pong',
            pingTimestamp,
            timestamp: Date.now()
        };
        
        logger.trace('📦 Built pong packet');
        return JSON.stringify(packet);
    }
    
    /**
     * Build binary packet for media or encrypted content
     */
    buildBinaryPacket(data, packetType = 0x01) {
        const header = Buffer.alloc(4);
        header.writeUInt8(packetType, 0);
        header.writeUInt8(0x00, 1); // Flags
        header.writeUInt16BE(data.length, 2);
        
        const packet = Buffer.concat([header, data]);
        
        logger.trace('📦 Built binary packet', { type: packetType, size: data.length });
        return packet;
    }
    
    /**
     * Generate signature for authentication
     */
    generateSignature(authData) {
        if (!this.credentials?.secretKey) {
            return null;
        }
        
        const data = `${authData.clientId}:${authData.serverRef}:${authData.timestamp}`;
        return CryptoUtil.createSignature(data, this.credentials.secretKey);
    }
    
    /**
     * Sign packet with credentials
     */
    signPacket(packet) {
        if (!this.credentials?.secretKey) {
            return null;
        }
        
        const packetString = JSON.stringify(packet, Object.keys(packet).sort());
        return CryptoUtil.createSignature(packetString, this.credentials.secretKey);
    }
    
    /**
     * Encrypt packet content
     */
    encryptPacket(packet, recipientPublicKey = null) {
        try {
            if (!this.credentials?.privateKey) {
                return packet;
            }
            
            const packetString = JSON.stringify(packet);
            const encrypted = CryptoUtil.aesEncrypt(packetString, this.credentials.secretKey);
            
            return {
                type: 'encrypted',
                data: encrypted,
                timestamp: Date.now()
            };
            
        } catch (error) {
            logger.error('Failed to encrypt packet:', error);
            return packet;
        }
    }
    
    /**
     * Update credentials
     */
    updateCredentials(credentials) {
        this.credentials = credentials;
        logger.debug('📦 PacketBuilder credentials updated');
    }
    
    /**
     * Get packet statistics
     */
    getStats() {
        return {
            messageCounter: this.messageCounter,
            hasCredentials: !!this.credentials
        };
    }
}