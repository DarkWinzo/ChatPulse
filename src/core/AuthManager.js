/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../utils/Logger.js';
import { CryptoUtil } from '../utils/CryptoUtil.js';
import { errorHandler, ChatPulseError } from '../utils/ErrorHandler.js';
import { ERROR_CODES } from '../utils/Constants.js';

export class AuthManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.sessionDir = options.sessionDir || './sessions';
        this.sessionId = options.sessionId || 'default';
        this.sessionFile = path.join(this.sessionDir, `${this.sessionId}.json`);
        this.credentials = null;
        this.isAuthenticated = false;
        this.authTimeout = options.authTimeout || 300000; // 5 minutes
        this.autoSave = options.autoSave !== false;
        
        this.ensureSessionDir();
    }
    
    /**
     * Ensure session directory exists
     */
    ensureSessionDir() {
        try {
            if (!fs.existsSync(this.sessionDir)) {
                fs.mkdirSync(this.sessionDir, { recursive: true });
                logger.debug(`Created session directory: ${this.sessionDir}`);
            }
        } catch (error) {
            logger.error('Failed to create session directory:', error);
        }
    }
    
    /**
     * Load existing session from file
     */
    async loadSession() {
        try {
            if (!fs.existsSync(this.sessionFile)) {
                logger.info('No existing session found');
                return null;
            }
            
            const sessionData = fs.readFileSync(this.sessionFile, 'utf8');
            const session = JSON.parse(sessionData);
            
            // Validate session data
            if (!this.validateSession(session)) {
                logger.warn('Invalid session data, removing file');
                this.clearSession();
                return null;
            }
            
            // Check if session is expired
            if (this.isSessionExpired(session)) {
                logger.warn('Session expired, removing file');
                this.clearSession();
                return null;
            }
            
            this.credentials = session.credentials;
            this.isAuthenticated = true;
            
            logger.info('✅ Session loaded successfully', {
                sessionId: this.sessionId,
                lastUsed: session.lastUsed
            });
            
            this.emit('auth.loaded', session);
            return session;
            
        } catch (error) {
            logger.error('Failed to load session:', error);
            this.clearSession();
            return null;
        }
    }
    
    /**
     * Save session to file
     */
    async saveSession(credentials = null) {
        try {
            if (credentials) {
                this.credentials = credentials;
            }
            
            if (!this.credentials) {
                throw new ChatPulseError(
                    'No credentials to save',
                    ERROR_CODES.AUTH_FAILED
                );
            }
            
            const sessionData = {
                sessionId: this.sessionId,
                credentials: this.credentials,
                createdAt: this.credentials.createdAt || Date.now(),
                lastUsed: Date.now(),
                version: '1.0.0'
            };
            
            // Encrypt sensitive data
            const encryptedSession = this.encryptSession(sessionData);
            
            fs.writeFileSync(this.sessionFile, JSON.stringify(encryptedSession, null, 2));
            
            logger.info('💾 Session saved successfully', {
                sessionId: this.sessionId,
                file: this.sessionFile
            });
            
            this.emit('auth.saved', sessionData);
            
        } catch (error) {
            throw errorHandler.createError(error, 'session save');
        }
    }
    
    /**
     * Authenticate with QR scan credentials
     */
    async authenticate(qrCredentials) {
        try {
            logger.info('🔐 Authenticating with QR credentials...');
            
            // Validate QR credentials
            this.validateQRCredentials(qrCredentials);
            
            // Process authentication
            const authResult = await this.processAuthentication(qrCredentials);
            
            if (authResult.success) {
                this.credentials = authResult.credentials;
                this.isAuthenticated = true;
                
                // Auto-save session if enabled
                if (this.autoSave) {
                    await this.saveSession();
                }
                
                logger.info('✅ Authentication successful');
                this.emit('auth.success', authResult.credentials);
                
                return authResult;
            } else {
                throw new ChatPulseError(
                    'Authentication failed',
                    ERROR_CODES.AUTH_FAILED,
                    authResult
                );
            }
            
        } catch (error) {
            this.isAuthenticated = false;
            this.emit('auth.failed', error);
            throw errorHandler.createError(error, 'authentication');
        }
    }
    
    /**
     * Validate QR credentials
     */
    validateQRCredentials(credentials) {
        const requiredFields = ['clientId', 'serverRef', 'publicKey', 'secretKey'];
        
        errorHandler.validateRequired(credentials, requiredFields, 'QR credentials');
        
        // Additional validation
        if (credentials.secretKey.length < 32) {
            throw new ChatPulseError(
                'Invalid secret key length',
                ERROR_CODES.AUTH_FAILED,
                { secretKeyLength: credentials.secretKey.length }
            );
        }
    }
    
    /**
     * Process authentication with WhatsApp servers
     */
    async processAuthentication(qrCredentials) {
        try {
            // Generate authentication payload
            const authPayload = this.generateAuthPayload(qrCredentials);
            
            // Create session credentials
            const sessionCredentials = {
                clientId: qrCredentials.clientId,
                serverRef: qrCredentials.serverRef,
                publicKey: qrCredentials.publicKey,
                secretKey: qrCredentials.secretKey,
                privateKey: qrCredentials.privateKey,
                sessionToken: CryptoUtil.generateSessionId(),
                clientToken: CryptoUtil.generateClientToken(),
                createdAt: Date.now(),
                lastUsed: Date.now(),
                deviceId: this.generateDeviceId(),
                browserVersion: this.getBrowserVersion()
            };
            
            return {
                success: true,
                credentials: sessionCredentials,
                payload: authPayload
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }
    
    /**
     * Generate authentication payload for WhatsApp
     */
    generateAuthPayload(credentials) {
        const payload = {
            clientId: credentials.clientId,
            serverRef: credentials.serverRef,
            publicKey: credentials.publicKey,
            timestamp: Date.now(),
            signature: this.generateAuthSignature(credentials)
        };
        
        return payload;
    }
    
    /**
     * Generate authentication signature
     */
    generateAuthSignature(credentials) {
        const data = `${credentials.clientId}:${credentials.serverRef}:${Date.now()}`;
        return CryptoUtil.createSignature(data, credentials.secretKey);
    }
    
    /**
     * Generate unique device ID
     */
    generateDeviceId() {
        return `chatpulse_${CryptoUtil.randomHex(16)}`;
    }
    
    /**
     * Get browser version info
     */
    getBrowserVersion() {
        return {
            name: 'ChatPulse',
            version: '1.0.0',
            os: process.platform,
            userAgent: 'ChatPulse/1.0.0 (WhatsApp Web API)'
        };
    }
    
    /**
     * Validate session data
     */
    validateSession(session) {
        try {
            if (!session || typeof session !== 'object') {
                return false;
            }
            
            const requiredFields = ['sessionId', 'credentials', 'createdAt', 'lastUsed'];
            const hasAllFields = requiredFields.every(field => session[field]);
            
            if (!hasAllFields) {
                return false;
            }
            
            // Validate credentials
            const credRequiredFields = ['clientId', 'serverRef', 'secretKey'];
            const hasAllCredFields = credRequiredFields.every(field => 
                session.credentials[field]
            );
            
            return hasAllCredFields;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Check if session is expired
     */
    isSessionExpired(session) {
        const now = Date.now();
        const lastUsed = session.lastUsed || session.createdAt;
        const timeDiff = now - lastUsed;
        
        // Session expires after 30 days of inactivity
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        return timeDiff > maxAge;
    }
    
    /**
     * Encrypt session data
     */
    encryptSession(sessionData) {
        try {
            // In production, use proper encryption with user-specific keys
            // For now, we'll use base64 encoding as a simple obfuscation
            const sensitiveFields = ['secretKey', 'privateKey', 'sessionToken', 'clientToken'];
            
            const encrypted = { ...sessionData };
            
            sensitiveFields.forEach(field => {
                if (encrypted.credentials[field]) {
                    encrypted.credentials[field] = CryptoUtil.encodeBase64(encrypted.credentials[field]);
                }
            });
            
            encrypted.encrypted = true;
            return encrypted;
            
        } catch (error) {
            logger.error('Failed to encrypt session:', error);
            return sessionData;
        }
    }
    
    /**
     * Decrypt session data
     */
    decryptSession(encryptedData) {
        try {
            if (!encryptedData.encrypted) {
                return encryptedData;
            }
            
            const sensitiveFields = ['secretKey', 'privateKey', 'sessionToken', 'clientToken'];
            const decrypted = { ...encryptedData };
            
            sensitiveFields.forEach(field => {
                if (decrypted.credentials[field]) {
                    decrypted.credentials[field] = CryptoUtil.decodeBase64(decrypted.credentials[field]).toString();
                }
            });
            
            delete decrypted.encrypted;
            return decrypted;
            
        } catch (error) {
            logger.error('Failed to decrypt session:', error);
            return encryptedData;
        }
    }
    
    /**
     * Clear session data
     */
    clearSession() {
        try {
            if (fs.existsSync(this.sessionFile)) {
                fs.unlinkSync(this.sessionFile);
                logger.info('🗑️ Session file removed');
            }
            
            this.credentials = null;
            this.isAuthenticated = false;
            
            this.emit('auth.cleared');
            
        } catch (error) {
            logger.error('Failed to clear session:', error);
        }
    }
    
    /**
     * Logout and clear session
     */
    async logout() {
        try {
            logger.info('👋 Logging out...');
            
            // Emit logout event
            this.emit('auth.logout');
            
            // Clear session
            this.clearSession();
            
            logger.info('✅ Logout successful');
            
        } catch (error) {
            throw errorHandler.createError(error, 'logout');
        }
    }
    
    /**
     * Get current authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            hasCredentials: !!this.credentials,
            sessionId: this.sessionId,
            sessionFile: this.sessionFile,
            lastUsed: this.credentials?.lastUsed || null
        };
    }
    
    /**
     * Refresh session (update last used timestamp)
     */
    async refreshSession() {
        if (this.credentials && this.autoSave) {
            this.credentials.lastUsed = Date.now();
            await this.saveSession();
        }
    }
}