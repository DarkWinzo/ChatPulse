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

export class TemplateHandler {
    constructor(whatsappClient) {
        this.client = whatsappClient;
    }
    
    /**
     * Send button message
     */
    async sendButtons(to, text, buttons, footer = null, options = {}) {
        try {
            errorHandler.validateRequired({ to, text, buttons }, 
                ['to', 'text', 'buttons'], 'send buttons');
            
            if (!Array.isArray(buttons) || buttons.length === 0) {
                throw new Error('Buttons must be a non-empty array');
            }
            
            if (buttons.length > 3) {
                throw new Error('Maximum 3 buttons allowed');
            }
            
            const messageData = {
                to: this.formatJid(to),
                content: {
                    text,
                    buttons: buttons.map((button, index) => ({
                        id: button.id || `btn_${index}`,
                        text: button.text,
                        type: button.type || 'reply'
                    })),
                    footer
                },
                messageType: 'buttonsMessage',
                ...options
            };
            
            return await this.sendTemplateMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send buttons');
        }
    }
    
    /**
     * Send list message
     */
    async sendList(to, text, buttonText, sections, options = {}) {
        try {
            errorHandler.validateRequired({ to, text, buttonText, sections }, 
                ['to', 'text', 'buttonText', 'sections'], 'send list');
            
            if (!Array.isArray(sections) || sections.length === 0) {
                throw new Error('Sections must be a non-empty array');
            }
            
            const messageData = {
                to: this.formatJid(to),
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
                messageType: 'listMessage',
                ...options
            };
            
            return await this.sendTemplateMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send list');
        }
    }
    
    /**
     * Send template message
     */
    async sendTemplateMessage(messageData) {
        try {
            const messageId = CryptoUtil.generateMessageId();
            messageData.messageId = messageId;
            
            const messagePacket = this.client.packetBuilder.buildButtonMessagePacket(
                messageData.to,
                messageData.content.text,
                messageData.content.buttons || [],
                messageData.content.footer
            );
            
            await this.client.wsManager.send(messagePacket);
            
            logger.sent(messageData.to, messageData.messageType);
            
            return {
                messageId,
                to: messageData.to,
                messageType: messageData.messageType,
                timestamp: Date.now(),
                success: true
            };
            
        } catch (error) {
            throw errorHandler.createError(error, 'send template message');
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
}