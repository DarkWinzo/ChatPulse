/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/Logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { CryptoUtil } from '../utils/CryptoUtil.js';
import { WHATSAPP_CONSTANTS } from '../utils/Constants.js';

export class MediaHandler {
    constructor(whatsappClient) {
        this.client = whatsappClient;
        this.uploadQueue = [];
        this.isProcessing = false;
    }
    
    /**
     * Send image message
     */
    async sendImage(to, imagePath, caption = '', options = {}) {
        try {
            errorHandler.validateRequired({ to, imagePath }, ['to', 'imagePath'], 'send image');
            
            // Read image file
            const imageBuffer = await this.readMediaFile(imagePath);
            
            // Validate file
            errorHandler.validateFile(
                { size: imageBuffer.length, name: imagePath },
                WHATSAPP_CONSTANTS.FILE_LIMITS.IMAGE,
                WHATSAPP_CONSTANTS.SUPPORTED_TYPES.IMAGE,
                'image upload'
            );
            
            // Upload media first
            const uploadResult = await this.uploadMedia(imageBuffer, 'image');
            
            if (!uploadResult.success) {
                throw new Error(`Image upload failed: ${uploadResult.error}`);
            }
            
            // Send image message
            const messageData = {
                to: this.formatJid(to),
                content: {
                    url: uploadResult.url,
                    caption,
                    mimetype: this.getMimeType(imagePath),
                    fileLength: imageBuffer.length,
                    fileSha256: CryptoUtil.sha256(imageBuffer).toString('base64'),
                    mediaKey: uploadResult.mediaKey
                },
                messageType: WHATSAPP_CONSTANTS.MESSAGE_TYPES.IMAGE,
                ...options
            };
            
            return await this.sendMediaMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send image');
        }
    }
    
    /**
     * Send video message
     */
    async sendVideo(to, videoPath, caption = '', options = {}) {
        try {
            errorHandler.validateRequired({ to, videoPath }, ['to', 'videoPath'], 'send video');
            
            const videoBuffer = await this.readMediaFile(videoPath);
            
            errorHandler.validateFile(
                { size: videoBuffer.length, name: videoPath },
                WHATSAPP_CONSTANTS.FILE_LIMITS.VIDEO,
                WHATSAPP_CONSTANTS.SUPPORTED_TYPES.VIDEO,
                'video upload'
            );
            
            const uploadResult = await this.uploadMedia(videoBuffer, 'video');
            
            if (!uploadResult.success) {
                throw new Error(`Video upload failed: ${uploadResult.error}`);
            }
            
            const messageData = {
                to: this.formatJid(to),
                content: {
                    url: uploadResult.url,
                    caption,
                    mimetype: this.getMimeType(videoPath),
                    fileLength: videoBuffer.length,
                    fileSha256: CryptoUtil.sha256(videoBuffer).toString('base64'),
                    mediaKey: uploadResult.mediaKey,
                    seconds: options.duration || 0
                },
                messageType: WHATSAPP_CONSTANTS.MESSAGE_TYPES.VIDEO,
                ...options
            };
            
            return await this.sendMediaMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send video');
        }
    }
    
    /**
     * Send audio message
     */
    async sendAudio(to, audioPath, options = {}) {
        try {
            errorHandler.validateRequired({ to, audioPath }, ['to', 'audioPath'], 'send audio');
            
            const audioBuffer = await this.readMediaFile(audioPath);
            
            errorHandler.validateFile(
                { size: audioBuffer.length, name: audioPath },
                WHATSAPP_CONSTANTS.FILE_LIMITS.AUDIO,
                WHATSAPP_CONSTANTS.SUPPORTED_TYPES.AUDIO,
                'audio upload'
            );
            
            const uploadResult = await this.uploadMedia(audioBuffer, 'audio');
            
            if (!uploadResult.success) {
                throw new Error(`Audio upload failed: ${uploadResult.error}`);
            }
            
            const messageData = {
                to: this.formatJid(to),
                content: {
                    url: uploadResult.url,
                    mimetype: this.getMimeType(audioPath),
                    fileLength: audioBuffer.length,
                    fileSha256: CryptoUtil.sha256(audioBuffer).toString('base64'),
                    mediaKey: uploadResult.mediaKey,
                    seconds: options.duration || 0,
                    ptt: options.voiceNote || false
                },
                messageType: WHATSAPP_CONSTANTS.MESSAGE_TYPES.AUDIO,
                ...options
            };
            
            return await this.sendMediaMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send audio');
        }
    }
    
    /**
     * Send document message
     */
    async sendDocument(to, documentPath, filename, options = {}) {
        try {
            errorHandler.validateRequired({ to, documentPath, filename }, 
                ['to', 'documentPath', 'filename'], 'send document');
            
            const documentBuffer = await this.readMediaFile(documentPath);
            
            errorHandler.validateFile(
                { size: documentBuffer.length, name: documentPath },
                WHATSAPP_CONSTANTS.FILE_LIMITS.DOCUMENT,
                WHATSAPP_CONSTANTS.SUPPORTED_TYPES.DOCUMENT,
                'document upload'
            );
            
            const uploadResult = await this.uploadMedia(documentBuffer, 'document');
            
            if (!uploadResult.success) {
                throw new Error(`Document upload failed: ${uploadResult.error}`);
            }
            
            const messageData = {
                to: this.formatJid(to),
                content: {
                    url: uploadResult.url,
                    filename,
                    mimetype: this.getMimeType(documentPath),
                    fileLength: documentBuffer.length,
                    fileSha256: CryptoUtil.sha256(documentBuffer).toString('base64'),
                    mediaKey: uploadResult.mediaKey,
                    pageCount: options.pageCount || 0
                },
                messageType: WHATSAPP_CONSTANTS.MESSAGE_TYPES.DOCUMENT,
                ...options
            };
            
            return await this.sendMediaMessage(messageData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'send document');
        }
    }
    
    /**
     * Upload media to WhatsApp servers
     */
    async uploadMedia(mediaBuffer, mediaType) {
        try {
            const uploadId = CryptoUtil.generateMessageId();
            const mediaKey = CryptoUtil.randomBytes(32);
            
            // Build upload packet
            const uploadPacket = this.client.packetBuilder.buildMediaUploadPacket(mediaBuffer, mediaType);
            
            // Send upload request
            await this.client.wsManager.send(uploadPacket);
            
            // Wait for upload response
            const uploadResult = await this.waitForUploadResponse(uploadId);
            
            return {
                success: true,
                uploadId,
                url: uploadResult.url,
                mediaKey: mediaKey.toString('base64'),
                directPath: uploadResult.directPath
            };
            
        } catch (error) {
            logger.error('Media upload failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Wait for media upload response
     */
    async waitForUploadResponse(uploadId, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Upload timeout'));
            }, timeout);
            
            const onUploadResponse = (response) => {
                if (response.uploadId === uploadId) {
                    clearTimeout(timeoutId);
                    this.client.off('media.upload.response', onUploadResponse);
                    
                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error || 'Upload failed'));
                    }
                }
            };
            
            this.client.on('media.upload.response', onUploadResponse);
        });
    }
    
    /**
     * Send media message
     */
    async sendMediaMessage(messageData) {
        try {
            const messageId = CryptoUtil.generateMessageId();
            messageData.messageId = messageId;
            
            const messagePacket = this.client.packetBuilder.buildMessagePacket(
                messageData.to,
                messageData.content,
                messageData.messageType
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
            throw errorHandler.createError(error, 'send media message');
        }
    }
    
    /**
     * Read media file from path
     */
    async readMediaFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            return fs.readFileSync(filePath);
            
        } catch (error) {
            throw new Error(`Failed to read media file: ${error.message}`);
        }
    }
    
    /**
     * Get MIME type from file extension
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase().substring(1);
        
        const mimeTypes = {
            // Images
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            
            // Videos
            mp4: 'video/mp4',
            avi: 'video/x-msvideo',
            mov: 'video/quicktime',
            mkv: 'video/x-matroska',
            '3gp': 'video/3gpp',
            
            // Audio
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            ogg: 'audio/ogg',
            aac: 'audio/aac',
            m4a: 'audio/mp4',
            
            // Documents
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            txt: 'text/plain'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
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
     * Download media from WhatsApp
     */
    async downloadMedia(message) {
        try {
            if (!message.content?.url) {
                throw new Error('No media URL found in message');
            }
            
            // This would implement the actual download logic
            // For now, return a placeholder
            logger.info(`📥 Downloading media from: ${message.content.url}`);
            
            return {
                success: true,
                buffer: Buffer.from('placeholder'),
                mimetype: message.content.mimetype,
                filename: message.content.filename
            };
            
        } catch (error) {
            throw errorHandler.createError(error, 'download media');
        }
    }
    
    /**
     * Get media handler statistics
     */
    getStats() {
        return {
            uploadQueue: this.uploadQueue.length,
            isProcessing: this.isProcessing
        };
    }
}