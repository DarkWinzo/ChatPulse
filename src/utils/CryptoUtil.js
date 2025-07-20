/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import crypto from 'crypto';

export class CryptoUtil {
    /**
     * Generate random bytes
     */
    static randomBytes(length) {
        return crypto.randomBytes(length);
    }
    
    /**
     * Generate random hex string
     */
    static randomHex(length) {
        return crypto.randomBytes(length).toString('hex');
    }
    
    /**
     * Generate random base64 string
     */
    static randomBase64(length) {
        return crypto.randomBytes(length).toString('base64');
    }
    
    /**
     * Generate HMAC signature
     */
    static hmacSha256(data, key) {
        return crypto.createHmac('sha256', key).update(data).digest();
    }
    
    /**
     * Generate SHA256 hash
     */
    static sha256(data) {
        return crypto.createHash('sha256').update(data).digest();
    }
    
    /**
     * Generate MD5 hash
     */
    static md5(data) {
        return crypto.createHash('md5').update(data).digest('hex');
    }
    
    /**
     * AES encryption
     */
    static aesEncrypt(data, key, iv) {
        const cipher = crypto.createCipher('aes-256-cbc', key);
        cipher.setAutoPadding(true);
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }
    
    /**
     * AES decryption
     */
    static aesDecrypt(encryptedData, key) {
        const decipher = crypto.createDecipher('aes-256-cbc', key);
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    
    /**
     * Generate key pair for encryption
     */
    static generateKeyPair() {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
    }
    
    /**
     * Generate WhatsApp-style message ID
     */
    static generateMessageId() {
        const timestamp = Date.now().toString(36);
        const random = this.randomHex(8);
        return `${timestamp}${random}`.toUpperCase();
    }
    
    /**
     * Generate session ID
     */
    static generateSessionId() {
        return this.randomHex(16);
    }
    
    /**
     * Generate client token
     */
    static generateClientToken() {
        return this.randomBase64(32);
    }
    
    /**
     * Encode binary data to base64
     */
    static encodeBase64(data) {
        if (Buffer.isBuffer(data)) {
            return data.toString('base64');
        }
        return Buffer.from(data).toString('base64');
    }
    
    /**
     * Decode base64 to binary data
     */
    static decodeBase64(base64String) {
        return Buffer.from(base64String, 'base64');
    }
    
    /**
     * Generate WhatsApp Web client ID
     */
    static generateClientId() {
        const randomPart = this.randomHex(16);
        return `chatpulse_${randomPart}`;
    }
    
    /**
     * Create signature for WhatsApp requests
     */
    static createSignature(data, secret) {
        return this.hmacSha256(data, secret).toString('base64');
    }
    
    /**
     * Validate signature
     */
    static validateSignature(data, signature, secret) {
        const expectedSignature = this.createSignature(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'base64'),
            Buffer.from(expectedSignature, 'base64')
        );
    }
}