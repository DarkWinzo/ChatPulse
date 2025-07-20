/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import fs from 'fs';
import path from 'path';

export class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info';
        this.enableFile = options.enableFile || false;
        this.logDir = options.logDir || './logs';
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m'
        };
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        if (this.enableFile) {
            this.ensureLogDir();
        }
    }
    
    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    
    getTimestamp() {
        return new Date().toISOString();
    }
    
    formatMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        let formattedMessage = `${prefix} ${message}`;
        if (data) {
            formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
        }
        
        return formattedMessage;
    }
    
    colorize(level, message) {
        const colorMap = {
            error: this.colors.red,
            warn: this.colors.yellow,
            info: this.colors.cyan,
            debug: this.colors.magenta,
            trace: this.colors.dim
        };
        
        const color = colorMap[level] || this.colors.white;
        return `${color}${message}${this.colors.reset}`;
    }
    
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level];
    }
    
    writeToFile(level, message) {
        if (!this.enableFile) return;
        
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `chatpulse-${date}.log`);
        
        try {
            fs.appendFileSync(logFile, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }
    
    log(level, message, data = null) {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = this.formatMessage(level, message, data);
        const coloredMessage = this.colorize(level, formattedMessage);
        
        console.log(coloredMessage);
        this.writeToFile(level, formattedMessage);
    }
    
    error(message, data = null) {
        this.log('error', message, data);
    }
    
    warn(message, data = null) {
        this.log('warn', message, data);
    }
    
    info(message, data = null) {
        this.log('info', message, data);
    }
    
    debug(message, data = null) {
        this.log('debug', message, data);
    }
    
    trace(message, data = null) {
        this.log('trace', message, data);
    }
    
    // Special methods for WhatsApp events
    qr(qrCode) {
        this.info('🔗 QR Code generated', { qrCode: qrCode.substring(0, 50) + '...' });
    }
    
    connection(state, reason = null) {
        const emoji = state === 'open' ? '✅' : state === 'connecting' ? '🔄' : '❌';
        this.info(`${emoji} Connection ${state}`, reason ? { reason } : null);
    }
    
    message(from, type, content = null) {
        this.info(`📨 Message received from ${from}`, { type, content });
    }
    
    sent(to, type) {
        this.info(`📤 Message sent to ${to}`, { type });
    }
}

// Create default logger instance
export const logger = new Logger({
    level: process.env.LOG_LEVEL || 'info',
    enableFile: process.env.ENABLE_FILE_LOGGING === 'true'
});