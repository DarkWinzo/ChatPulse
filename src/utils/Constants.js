/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

export const WHATSAPP_CONSTANTS = {
    // WebSocket endpoints
    WS_URL: 'wss://web.whatsapp.com/ws/chat',
    WS_ORIGIN: 'https://web.whatsapp.com',
    
    // API endpoints
    BASE_URL: 'https://web.whatsapp.com',
    UPLOAD_URL: 'https://mmg.whatsapp.net',
    
    // Protocol versions
    WA_VERSION: [2, 2413, 51],
    BROWSER_VERSION: [3, 0],
    
    // Connection settings
    PING_INTERVAL: 30000, // 30 seconds
    RECONNECT_DELAY: 5000, // 5 seconds
    MAX_RECONNECT_ATTEMPTS: 10,
    
    // Message types
    MESSAGE_TYPES: {
        TEXT: 'conversation',
        IMAGE: 'imageMessage',
        VIDEO: 'videoMessage',
        AUDIO: 'audioMessage',
        DOCUMENT: 'documentMessage',
        STICKER: 'stickerMessage',
        LOCATION: 'locationMessage',
        CONTACT: 'contactMessage',
        POLL: 'pollCreationMessage',
        BUTTON: 'buttonsMessage',
        LIST: 'listMessage',
        TEMPLATE: 'templateMessage'
    },
    
    // Event types
    EVENTS: {
        QR_UPDATE: 'qr',
        CONNECTION_UPDATE: 'connection.update',
        MESSAGE: 'messages.upsert',
        MESSAGE_REACTION: 'messages.reaction',
        MESSAGE_DELETE: 'messages.delete',
        PRESENCE_UPDATE: 'presence.update',
        CONTACTS_UPDATE: 'contacts.update',
        GROUPS_UPDATE: 'groups.update',
        BLOCKLIST_UPDATE: 'blocklist.update'
    },
    
    // Connection states
    CONNECTION_STATE: {
        CLOSE: 'close',
        CONNECTING: 'connecting',
        OPEN: 'open'
    },
    
    // Authentication states
    AUTH_STATE: {
        CREDS_UPDATE: 'creds.update',
        KEYS_UPDATE: 'keys.update'
    },
    
    // Headers for requests
    DEFAULT_HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits'
    },
    
    // File size limits (in bytes)
    FILE_LIMITS: {
        IMAGE: 16 * 1024 * 1024, // 16MB
        VIDEO: 64 * 1024 * 1024, // 64MB
        AUDIO: 16 * 1024 * 1024, // 16MB
        DOCUMENT: 100 * 1024 * 1024 // 100MB
    },
    
    // Supported file types
    SUPPORTED_TYPES: {
        IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        VIDEO: ['mp4', 'avi', 'mov', 'mkv', '3gp'],
        AUDIO: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
        DOCUMENT: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
    }
};

export const ERROR_CODES = {
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    AUTH_FAILED: 'AUTH_FAILED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    INVALID_MESSAGE: 'INVALID_MESSAGE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    UNSUPPORTED_FILE: 'UNSUPPORTED_FILE',
    RATE_LIMITED: 'RATE_LIMITED',
    NETWORK_ERROR: 'NETWORK_ERROR'
};