# ChatPulse - Advanced WhatsApp Web API Library

[![npm version](https://badge.fury.io/js/chatpulse.svg)](https://badge.fury.io/js/chatpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

**ChatPulse** is a production-grade, reverse-engineered WhatsApp Web API library built with pure JavaScript (Node.js). It provides a powerful, standalone alternative to Baileys and WA Web.js with **zero dependencies** on Puppeteer, Baileys, Venom, or any third-party WhatsApp APIs.

## 🚀 Features

- **Pure WebSocket Connection** - Direct connection to WhatsApp Web (wss://web.whatsapp.com/ws)
- **QR-based Authentication** - Generate QR codes from auth payload
- **Session Management** - Save/load sessions from local files
- **Real-time Reconnection** - Automatic reconnect on disconnect
- **Multi-device Ready** - Future-proof design for number-pairing
- **Full Message Support** - Text, images, audio, video, documents, buttons, lists, polls, stickers, reactions
- **Group Management** - Participant updates and group actions
- **Event System** - onMessage, onReaction, onPresence, onEdit, onDelete
- **Advanced Features** - Reply, forward, quote support
- **Production Logging** - Comprehensive error handling and logging
- **Modular Architecture** - Clean, maintainable file structure
- **CLI Support** - Testing connections and sessions
- **Business Templates** - Buttons and structured templates

## 📦 Installation

```bash
npm install chatpulse
```

## 🔧 Quick Start

```javascript
import { WhatsApp } from 'chatpulse';

const client = new WhatsApp({
    sessionId: 'my-session',
    logLevel: 'info'
});

// Listen for QR code
client.on('qr', (qr) => {
    console.log('Scan this QR code:', qr);
});

// Listen for connection updates
client.on('connection.update', (update) => {
    console.log('Connection update:', update);
});

// Listen for messages
client.on('messages.upsert', ({ messages }) => {
    for (const message of messages) {
        console.log('Received message:', message);
    }
});

// Connect to WhatsApp
await client.connect();

// Send a text message
await client.sendMessage('1234567890@s.whatsapp.net', 'Hello from ChatPulse!');
```

## 📚 Documentation

### Basic Usage

#### Sending Messages

```javascript
// Text message
await client.sendMessage('1234567890@s.whatsapp.net', 'Hello World!');

// Reply to a message
await client.sendReply('1234567890@s.whatsapp.net', 'Reply text', quotedMessage);

// Send with mentions
await client.sendMention('group@g.us', 'Hello @user!', ['1234567890@s.whatsapp.net']);

// Send typing indicator
await client.sendTyping('1234567890@s.whatsapp.net', true);
```

#### Media Messages

```javascript
// Send image
await client.sendImage('1234567890@s.whatsapp.net', './image.jpg', 'Caption');

// Send video
await client.sendVideo('1234567890@s.whatsapp.net', './video.mp4', 'Video caption');

// Send audio
await client.sendAudio('1234567890@s.whatsapp.net', './audio.mp3');

// Send document
await client.sendDocument('1234567890@s.whatsapp.net', './document.pdf', 'document.pdf');
```

#### Interactive Messages

```javascript
// Button message
await client.sendButtons(
    '1234567890@s.whatsapp.net',
    'Choose an option:',
    [
        { id: 'btn1', text: 'Option 1' },
        { id: 'btn2', text: 'Option 2' }
    ],
    'Footer text'
);

// List message
await client.sendList(
    '1234567890@s.whatsapp.net',
    'Select from list:',
    'View Options',
    [
        {
            title: 'Section 1',
            rows: [
                { id: 'row1', title: 'Row 1', description: 'Description 1' },
                { id: 'row2', title: 'Row 2', description: 'Description 2' }
            ]
        }
    ]
);

// Poll
await client.sendPoll(
    '1234567890@s.whatsapp.net',
    'What\'s your favorite color?',
    ['Red', 'Blue', 'Green'],
    { multipleChoice: false }
);
```

#### Reactions and Actions

```javascript
// Send reaction
await client.sendReaction('messageId', '👍', 'chatId');

// Delete message
await client.deleteMessage('messageId', 'chatId', true); // true = for everyone

// Edit message
await client.editMessage('messageId', 'chatId', 'New text');
```

### Event Handling

```javascript
// Connection events
client.on('connection.update', (update) => {
    if (update.connection === 'open') {
        console.log('Connected to WhatsApp!');
    }
});

// Authentication events
client.on('auth.success', (credentials) => {
    console.log('Authentication successful');
});

client.on('auth.failed', (error) => {
    console.log('Authentication failed:', error);
});

// Message events
client.on('messages.upsert', ({ messages, type }) => {
    for (const message of messages) {
        if (type === 'notify') {
            console.log('New message:', message);
        }
    }
});

// Reaction events
client.on('messages.reaction', ({ key, reaction }) => {
    console.log('Reaction received:', reaction.text, 'on message:', key.id);
});

// Presence events
client.on('presence.update', ({ id, presences }) => {
    console.log('Presence update for:', id, presences);
});

// Group events
client.on('groups.update', (update) => {
    console.log('Group update:', update);
});
```

### Session Management

```javascript
// Custom session configuration
const client = new WhatsApp({
    sessionId: 'custom-session',
    sessionDir: './my-sessions',
    autoSave: true
});

// Manual session operations
await client.authManager.saveSession();
await client.authManager.loadSession();
await client.authManager.clearSession();

// Logout and clear session
await client.logout();
```

### Advanced Configuration

```javascript
const client = new WhatsApp({
    sessionId: 'advanced-session',
    sessionDir: './sessions',
    logLevel: 'debug',
    enableFileLogging: true,
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 5000,
    qrTimeout: 60000,
    autoSave: true
});
```

## 🏗️ Architecture

```
chatpulse/
├── src/
│   ├── core/                 # Core functionality
│   │   ├── WebSocketManager.js    # WebSocket connection handling
│   │   ├── QRManager.js           # QR code generation and handling
│   │   ├── AuthManager.js         # Authentication and session management
│   │   ├── PacketBuilder.js       # WhatsApp protocol packet building
│   │   └── PacketParser.js        # Incoming packet parsing
│   ├── handlers/             # Message and media handlers
│   │   ├── MessageHandler.js      # Text message handling
│   │   ├── MediaHandler.js        # Media upload/download
│   │   ├── TemplateHandler.js     # Button/list templates
│   │   └── PollHandler.js         # Poll creation and voting
│   ├── utils/                # Utilities
│   │   ├── Logger.js              # Logging system
│   │   ├── ErrorHandler.js        # Error handling and retry logic
│   │   ├── CryptoUtil.js          # Encryption utilities
│   │   └── Constants.js           # Configuration constants
│   ├── config/               # Configuration
│   │   └── settings.json          # Default settings
│   └── sdk/                  # Public API
│       └── WhatsApp.js            # Main client class
├── sessions/                 # Session storage
├── tests/                    # Test suites
└── package.json
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test MessageHandler.test.js
```

## 🔧 CLI Usage

```bash
# Test connection
npm run cli connect --session my-session

# Send test message
npm run cli send --to 1234567890 --message "Hello from CLI"

# View session info
npm run cli session --info
```

## 🛡️ Error Handling

ChatPulse includes comprehensive error handling with automatic retry logic:

```javascript
import { ErrorHandler, ChatPulseError } from 'chatpulse';

// Custom error handler
const errorHandler = new ErrorHandler({
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error, context, retryCount) => {
        console.log(`Error in ${context} (attempt ${retryCount}):`, error.message);
    }
});

// Handle specific errors
client.on('error', (error) => {
    if (error instanceof ChatPulseError) {
        switch (error.code) {
            case 'CONNECTION_FAILED':
                console.log('Connection failed, retrying...');
                break;
            case 'AUTH_FAILED':
                console.log('Authentication failed, please scan QR again');
                break;
            case 'RATE_LIMITED':
                console.log('Rate limited, slowing down...');
                break;
        }
    }
});
```

## 📊 Logging

```javascript
import { Logger } from 'chatpulse';

// Custom logger
const logger = new Logger({
    level: 'debug',
    enableFile: true,
    logDir: './logs'
});

// Log levels: error, warn, info, debug, trace
logger.info('Application started');
logger.error('Something went wrong', { error: 'details' });
```

## 🔐 Security Features

- **End-to-end encryption** support
- **Session encryption** for stored credentials
- **Signature verification** for packets
- **Rate limiting** to prevent abuse
- **Input validation** for all parameters

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer

**DarkWinzo**
- GitHub: [@DarkWinzo](https://github.com/DarkWinzo)
- Email: isurulakshan9998@gmail.com

## 🏢 Organization

**DarkSide Developer Team**
- GitHub: [@DarkSide-Developers](https://github.com/DarkSide-Developers)
- Repository: [ChatPulse](https://github.com/DarkSide-Developers/ChatPulse)

## ⚠️ Disclaimer

This library is not affiliated with, endorsed by, or sponsored by WhatsApp Inc. It is an independent implementation based on reverse engineering of the WhatsApp Web protocol. Use at your own risk and ensure compliance with WhatsApp's Terms of Service.

## 🙏 Acknowledgments

- WhatsApp for creating an amazing messaging platform
- The open-source community for inspiration and tools
- All contributors who help improve this library

---

**© 2025 DarkSide Developers Team. All rights reserved.**