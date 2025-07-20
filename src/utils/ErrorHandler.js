/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { logger } from './Logger.js';
import { ERROR_CODES } from './Constants.js';

export class ChatPulseError extends Error {
    constructor(message, code, details = null) {
        super(message);
        this.name = 'ChatPulseError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

export class ErrorHandler {
    constructor(options = {}) {
        this.enableRetry = options.enableRetry !== false;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.onError = options.onError || null;
    }
    
    /**
     * Handle errors with automatic retry logic
     */
    async handle(operation, context = '', retryCount = 0) {
        try {
            return await operation();
        } catch (error) {
            const chatPulseError = this.createError(error, context);
            
            logger.error(`Error in ${context}:`, {
                message: chatPulseError.message,
                code: chatPulseError.code,
                details: chatPulseError.details,
                retryCount
            });
            
            // Call custom error handler if provided
            if (this.onError) {
                try {
                    await this.onError(chatPulseError, context, retryCount);
                } catch (handlerError) {
                    logger.error('Error in custom error handler:', handlerError);
                }
            }
            
            // Retry logic for retryable errors
            if (this.shouldRetry(chatPulseError, retryCount)) {
                logger.warn(`Retrying operation ${context} (attempt ${retryCount + 1}/${this.maxRetries})`);
                await this.delay(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
                return this.handle(operation, context, retryCount + 1);
            }
            
            throw chatPulseError;
        }
    }
    
    /**
     * Create a standardized ChatPulse error
     */
    createError(error, context) {
        if (error instanceof ChatPulseError) {
            return error;
        }
        
        let code = ERROR_CODES.NETWORK_ERROR;
        let message = error.message || 'Unknown error occurred';
        let details = null;
        
        // Categorize common errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            code = ERROR_CODES.CONNECTION_FAILED;
            message = 'Failed to connect to WhatsApp servers';
        } else if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
            code = ERROR_CODES.NETWORK_ERROR;
            message = 'Network connection was reset';
        } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            code = ERROR_CODES.AUTH_FAILED;
            message = 'Authentication failed';
        } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            code = ERROR_CODES.SESSION_EXPIRED;
            message = 'Session expired or access denied';
        } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            code = ERROR_CODES.RATE_LIMITED;
            message = 'Rate limit exceeded';
        }
        
        details = {
            originalError: error.message,
            originalCode: error.code,
            context,
            stack: error.stack
        };
        
        return new ChatPulseError(message, code, details);
    }
    
    /**
     * Determine if an error should be retried
     */
    shouldRetry(error, retryCount) {
        if (!this.enableRetry || retryCount >= this.maxRetries) {
            return false;
        }
        
        // Don't retry authentication or validation errors
        const nonRetryableCodes = [
            ERROR_CODES.AUTH_FAILED,
            ERROR_CODES.INVALID_MESSAGE,
            ERROR_CODES.FILE_TOO_LARGE,
            ERROR_CODES.UNSUPPORTED_FILE
        ];
        
        return !nonRetryableCodes.includes(error.code);
    }
    
    /**
     * Delay execution for retry
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Wrap a function with error handling
     */
    wrap(fn, context) {
        return async (...args) => {
            return this.handle(() => fn(...args), context);
        };
    }
    
    /**
     * Validate required parameters
     */
    validateRequired(params, requiredFields, context = 'operation') {
        const missing = requiredFields.filter(field => 
            params[field] === undefined || params[field] === null || params[field] === ''
        );
        
        if (missing.length > 0) {
            throw new ChatPulseError(
                `Missing required parameters: ${missing.join(', ')}`,
                ERROR_CODES.INVALID_MESSAGE,
                { missing, context }
            );
        }
    }
    
    /**
     * Validate file size and type
     */
    validateFile(file, maxSize, allowedTypes, context = 'file upload') {
        if (file.size > maxSize) {
            throw new ChatPulseError(
                `File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
                ERROR_CODES.FILE_TOO_LARGE,
                { fileSize: file.size, maxSize, context }
            );
        }
        
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (allowedTypes && !allowedTypes.includes(extension)) {
            throw new ChatPulseError(
                `Unsupported file type: ${extension}. Allowed types: ${allowedTypes.join(', ')}`,
                ERROR_CODES.UNSUPPORTED_FILE,
                { fileType: extension, allowedTypes, context }
            );
        }
    }
}

// Create default error handler instance
export const errorHandler = new ErrorHandler();