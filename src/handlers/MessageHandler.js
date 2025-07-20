/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { logger } from '../utils/Logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { CryptoUtil } from '../utils/CryptoUtil.js';
import { WHATSAPP_CONSTANTS } from '../utils/Constants.js';

export class MessageHandler {
    constructor(whatsappClient) {
        this.client = whatsappClient;
        this.messageQueue = [];
        this.isProcessing = false;
        this.rateLimit = {
            messages: 0,
            resetTime: Date.now() + 60000 // 1 minute
        };
    }
    
    /**
     * Send text message
     */
    async sendText(to, text, options = {}) {
        try {
            errorHandler.validateRequired({ to, text }, ['to', 'text'], 'send text message');
            
            const messageData = {
                to: this.formatJid(to),
                content: text,
                messageType: WHATSAPP_CONSTANTS.MESSAGE_TYPES.TEXT,
                quotedMessage: options.quoted || null,
                mentions: options.mentions || [],
                ...options
            };
            
            return await this.sendMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send text message');
        }
    }
    
    /**
     * Send reply to a message
     */
    async sendReply(to, text, quotedMessage, options = {}) {
        try {
            return await this.sendText(to, text, {
                ...options,
                quoted: quotedMessage
            });
            
        } catch (error) {
            throw errorHandler.createError(error, 'send reply');
        }
    }
    
    /**
     * Forward message
     */
    async forwardMessage(to, message, options = {}) {
        try {
            errorHandler.validateRequired({ to, message }, ['to', 'message'], 'forward message');
            
            const messageData = {
                to: this.formatJid(to),
                content: message.content || message.text,
                messageType: message.messageType || WHATSAPP_CONSTANTS.MESSAGE_TYPES.TEXT,
                forwarded: true,
                forwardedFrom: message.from,
                ...options
            };
            
            return await this.sendMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'forward message');
        }
    }
    
    /**
     * Send message with mentions
     */
    async sendMention(to, text, mentions, options = {}) {
        try {
            const formattedMentions = mentions.map(mention => this.formatJid(mention));
            
            return await this.sendText(to, text, {
                ...options,
                mentions: formattedMentions
            });
            
        } catch (error) {
            throw errorHandler.createError(error, 'send mention');
        }
    }
    
    /**
     * Send typing indicator
     */
    async sendTyping(to, isTyping = true) {
        try {
            const presence = isTyping ? 'composing' : 'paused';
            await this.client.updatePresence(this.formatJid(to), presence);
            
            logger.debug(`📝 Sent typing indicator: ${presence} to ${to}`);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send typing');
        }
    }
    
    /**
     * Mark message as read
     */
    async markAsRead(messageId, chatId) {
        try {
            const readPacket = this.client.packetBuilder.buildReadReceiptPacket(messageId, chatId);
            await this.client.wsManager.send(readPacket);
            
            logger.debug(`✅ Marked message as read: ${messageId}`);
            
        } catch (error) {
            throw errorHandler.createError(error, 'mark as read');
        }
    }
    
    /**
     * Delete message
     */
    async deleteMessage(messageId, chatId, forEveryone = false) {
        try {
            const deletePacket = this.client.packetBuilder.buildDeleteMessagePacket(
                messageId, 
                chatId, 
                forEveryone
            );
            await this.client.wsManager.send(deletePacket);
            
            logger.info(`🗑️ Deleted message: ${messageId} (for everyone: ${forEveryone})`);
            
            return { success: true, messageId, deletedForEveryone: forEveryone };
            
        } catch (error) {
            throw errorHandler.createError(error, 'delete message');
        }
    }
    
    /**
     * Edit message
     */
    async editMessage(messageId, chatId, newText) {
        try {
            errorHandler.validateRequired({ messageId, chatId, newText }, 
                ['messageId', 'chatId', 'newText'], 'edit message');
            
            const editPacket = this.client.packetBuilder.buildEditMessagePacket(
                messageId, 
                chatId, 
                newText
            );
            await this.client.wsManager.send(editPacket);
            
            logger.info(`✏️ Edited message: ${messageId}`);
            
            return { success: true, messageId, newText };
            
        } catch (error) {
            throw errorHandler.createError(error, 'edit message');
        }
    }
    
    /**
     * Send location message
     */
    async sendLocation(to, latitude, longitude, name = null, address = null, options = {}) {
        try {
            errorHandler.validateRequired({ to, latitude, longitude }, 
                ['to', 'latitude', 'longitude'], 'send location');
            
            const messageData = {
                to: this.formatJid(to),
                content: {
                    latitude,
                    longitude,
                    name,
                    address
                },
                messageType: WHATSAPP_CONSTANTS.MESSAGE_TYPES.LOCATION,
                ...options
            };
            
            return await this.sendMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send location');
        }
    }
    
    /**
     * Send contact message
     */
    async sendContact(to, contact, options = {}) {
        try {
            errorHandler.validateRequired({ to, contact }, ['to', 'contact'], 'send contact');
            
            const messageData = {
                to: this.formatJid(to),
                content: {
                    displayName: contact.name,
                    vcard: this.generateVCard(contact)
                },
                messageType: WHATSAPP_CONSTANTS.MESSAGE_TYPES.CONTACT,
                ...options
            };
            
            return await this.sendMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send contact');
        }
    }
    
    /**
     * Generate VCard for contact
     */
    generateVCard(contact) {
        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
        vcard += `FN:${contact.name}\n`;
        
        if (contact.phone) {
            vcard += `TEL;TYPE=CELL:${contact.phone}\n`;
        }
        
        if (contact.email) {
            vcard += `EMAIL:${contact.email}\n`;
        }
        
        if (contact.organization) {
            vcard += `ORG:${contact.organization}\n`;
        }
        
        vcard += 'END:VCARD';
        return vcard;
    }
    
    /**
     * Core message sending function
     */
    async sendMessage(messageData) {
        try {
            // Check rate limiting
            this.checkRateLimit();
            
            // Generate message ID
            const messageId = CryptoUtil.generateMessageId();
            messageData.messageId = messageId;
            
            // Build packet
            const messagePacket = this.client.packetBuilder.buildMessagePacket(
                messageData.to,
                messageData.content,
                messageData.messageType
            );
            
            // Add to queue if not connected
            if (!this.client.wsManager.isReady()) {
                this.messageQueue.push({ messageData, messagePacket });
                logger.debug('Message queued (not connected)', { messageId });
                return { messageId, queued: true };
            }
            
            // Send message
            await this.client.wsManager.send(messagePacket);
            
            // Update rate limit
            this.updateRateLimit();
            
            logger.sent(messageData.to, messageData.messageType);
            
            return {
                messageId,
                to: messageData.to,
                messageType: messageData.messageType,
                timestamp: Date.now(),
                success: true
            };
            
        } catch (error) {
            throw errorHandler.createError(error, 'send message');
        }
    }
    
    /**
     * Process queued messages
     */
    async processQueue() {
        if (this.isProcessing || this.messageQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        logger.debug(`Processing ${this.messageQueue.length} queued messages`);
        
        while (this.messageQueue.length > 0 && this.client.wsManager.isReady()) {
            const { messageData, messagePacket } = this.messageQueue.shift();
            
            try {
                await this.client.wsManager.send(messagePacket);
                logger.sent(messageData.to, messageData.messageType);
                
                // Small delay between messages
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                logger.error('Failed to send queued message:', error);
                // Re-queue the message
                this.messageQueue.unshift({ messageData, messagePacket });
                break;
            }
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Check rate limiting
     */
    checkRateLimit() {
        const now = Date.now();
        
        if (now > this.rateLimit.resetTime) {
            this.rateLimit.messages = 0;
            this.rateLimit.resetTime = now + 60000; // Reset every minute
        }
        
        if (this.rateLimit.messages >= 20) { // Max 20 messages per minute
            throw errorHandler.createError(
                new Error('Rate limit exceeded'),
                'rate limiting'
            );
        }
    }
    
    /**
     * Update rate limit counter
     */
    updateRateLimit() {
        this.rateLimit.messages++;
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
     * Parse JID to get number
     */
    parseJid(jid) {
        if (!jid) return null;
        return jid.split('@')[0];
    }
    
    /**
     * Check if JID is a group
     */
    isGroup(jid) {
        return jid && jid.endsWith('@g.us');
    }
    
    /**
     * Get message statistics
     */
    getStats() {
        return {
            queuedMessages: this.messageQueue.length,
            rateLimit: this.rateLimit,
            isProcessing: this.isProcessing
        };
    }
}