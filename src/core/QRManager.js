/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { logger } from '../utils/Logger.js';
import { CryptoUtil } from '../utils/CryptoUtil.js';
import { errorHandler, ChatPulseError } from '../utils/ErrorHandler.js';
import { ERROR_CODES } from '../utils/Constants.js';

export class QRManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.qrData = null;
        this.qrCode = null;
        this.qrTimeout = options.qrTimeout || 60000; // 60 seconds
        this.qrTimer = null;
        this.clientId = null;
        this.serverRef = null;
        this.publicKey = null;
        this.privateKey = null;
    }
    
    /**
     * Generate QR code from authentication data
     */
    async generateQR(authData) {
        try {
            logger.debug('🔗 Generating QR code from auth data');
            
            // Extract QR data from WhatsApp handshake
            this.qrData = this.extractQRData(authData);
            
            if (!this.qrData) {
                throw new ChatPulseError(
                    'Invalid authentication data for QR generation',
                    ERROR_CODES.AUTH_FAILED,
                    { authData }
                );
            }
            
            // Generate QR code image
            this.qrCode = await this.createQRImage(this.qrData);
            
            logger.qr(this.qrData);
            
            // Set QR expiration timer
            this.startQRTimer();
            
            // Emit QR update event
            this.emit('qr', {
                qr: this.qrData,
                qrCode: this.qrCode
            });
            
            return {
                qr: this.qrData,
                qrCode: this.qrCode
            };
            
        } catch (error) {
            throw errorHandler.createError(error, 'QR generation');
        }
    }
    
    /**
     * Extract QR data from WhatsApp authentication payload
     */
    extractQRData(authData) {
        try {
            // WhatsApp QR format: ref,publicKey,clientId,serverRef
            // This is a simplified implementation - actual WhatsApp protocol is more complex
            
            if (typeof authData === 'string') {
                return authData;
            }
            
            if (authData.ref && authData.publicKey && authData.clientId) {
                const qrComponents = [
                    authData.ref,
                    authData.publicKey,
                    authData.clientId,
                    authData.serverRef || ''
                ];
                
                return qrComponents.join(',');
            }
            
            // Handle binary auth data
            if (Buffer.isBuffer(authData)) {
                return this.parseBinaryAuthData(authData);
            }
            
            // Generate QR data if not provided
            return this.generateQRData();
            
        } catch (error) {
            logger.error('Failed to extract QR data:', error);
            return null;
        }
    }
    
    /**
     * Parse binary authentication data
     */
    parseBinaryAuthData(binaryData) {
        try {
            // This is a simplified parser for WhatsApp's binary auth protocol
            // In production, you'd need to implement the full binary protocol
            
            if (binaryData.length < 32) {
                throw new Error('Invalid binary auth data length');
            }
            
            // Extract components from binary data
            const ref = binaryData.slice(0, 16).toString('base64');
            const publicKey = binaryData.slice(16, 48).toString('base64');
            const clientId = binaryData.slice(48, 64).toString('base64');
            
            return `${ref},${publicKey},${clientId}`;
            
        } catch (error) {
            logger.error('Failed to parse binary auth data:', error);
            return null;
        }
    }
    
    /**
     * Generate QR data for new session
     */
    generateQRData() {
        try {
            // Generate key pair for encryption
            const keyPair = CryptoUtil.generateKeyPair();
            this.publicKey = keyPair.publicKey;
            this.privateKey = keyPair.privateKey;
            
            // Generate session identifiers
            this.clientId = CryptoUtil.generateClientId();
            this.serverRef = CryptoUtil.randomBase64(16);
            const ref = CryptoUtil.randomBase64(16);
            
            // Create QR data string
            const qrComponents = [
                ref,
                Buffer.from(this.publicKey).toString('base64'),
                this.clientId,
                this.serverRef
            ];
            
            return qrComponents.join(',');
            
        } catch (error) {
            logger.error('Failed to generate QR data:', error);
            return null;
        }
    }
    
    /**
     * Create QR code image from data
     */
    async createQRImage(qrData, options = {}) {
        try {
            const qrOptions = {
                type: 'terminal',
                small: true,
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                ...options
            };
            
            // Generate QR code as data URL for web display
            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                ...qrOptions,
                type: 'image/png',
                width: 256
            });
            
            // Also generate terminal version for CLI
            const qrCodeTerminal = await QRCode.toString(qrData, {
                ...qrOptions,
                type: 'terminal'
            });
            
            return {
                dataURL: qrCodeDataURL,
                terminal: qrCodeTerminal,
                raw: qrData
            };
            
        } catch (error) {
            throw new ChatPulseError(
                'Failed to generate QR code image',
                ERROR_CODES.AUTH_FAILED,
                { error: error.message, qrData }
            );
        }
    }
    
    /**
     * Start QR expiration timer
     */
    startQRTimer() {
        this.stopQRTimer();
        
        this.qrTimer = setTimeout(() => {
            logger.warn('⏰ QR code expired, generating new one...');
            this.emit('qr.expired');
            this.refreshQR();
        }, this.qrTimeout);
    }
    
    /**
     * Stop QR expiration timer
     */
    stopQRTimer() {
        if (this.qrTimer) {
            clearTimeout(this.qrTimer);
            this.qrTimer = null;
        }
    }
    
    /**
     * Refresh QR code
     */
    async refreshQR() {
        try {
            logger.info('🔄 Refreshing QR code...');
            
            // Generate new QR data
            const newQRData = this.generateQRData();
            await this.generateQR(newQRData);
            
        } catch (error) {
            logger.error('Failed to refresh QR code:', error);
            this.emit('error', error);
        }
    }
    
    /**
     * Validate QR scan result
     */
    validateQRScan(scanData) {
        try {
            if (!scanData || typeof scanData !== 'object') {
                return false;
            }
            
            // Check required fields for successful scan
            const requiredFields = ['clientId', 'serverRef', 'publicKey', 'secretKey'];
            const hasAllFields = requiredFields.every(field => scanData[field]);
            
            if (!hasAllFields) {
                logger.warn('QR scan data missing required fields');
                return false;
            }
            
            // Validate client ID matches
            if (scanData.clientId !== this.clientId) {
                logger.warn('QR scan client ID mismatch');
                return false;
            }
            
            return true;
            
        } catch (error) {
            logger.error('Failed to validate QR scan:', error);
            return false;
        }
    }
    
    /**
     * Process successful QR scan
     */
    processQRScan(scanData) {
        try {
            if (!this.validateQRScan(scanData)) {
                throw new ChatPulseError(
                    'Invalid QR scan data',
                    ERROR_CODES.AUTH_FAILED,
                    { scanData }
                );
            }
            
            logger.info('✅ QR code scanned successfully');
            
            // Stop QR timer
            this.stopQRTimer();
            
            // Extract authentication credentials
            const authCredentials = {
                clientId: scanData.clientId,
                serverRef: scanData.serverRef,
                publicKey: scanData.publicKey,
                secretKey: scanData.secretKey,
                privateKey: this.privateKey,
                timestamp: Date.now()
            };
            
            // Emit successful scan event
            this.emit('qr.scanned', authCredentials);
            
            return authCredentials;
            
        } catch (error) {
            throw errorHandler.createError(error, 'QR scan processing');
        }
    }
    
    /**
     * Clear QR data
     */
    clear() {
        this.stopQRTimer();
        this.qrData = null;
        this.qrCode = null;
        this.clientId = null;
        this.serverRef = null;
        this.publicKey = null;
        this.privateKey = null;
    }
    
    /**
     * Get current QR status
     */
    getStatus() {
        return {
            hasQR: !!this.qrData,
            qrData: this.qrData,
            clientId: this.clientId,
            serverRef: this.serverRef,
            isExpired: !this.qrTimer
        };
    }
}