# Real ChatPulse WhatsApp Bot

This guide shows how to create a **real working WhatsApp bot** using the ChatPulse npm package.

## Important Notes

The ChatPulse library is currently a framework that needs additional implementation to connect to real WhatsApp servers. This example shows how to extend ChatPulse to make it work while maintaining its clean architecture.

## Installation

```bash
# Install ChatPulse (your npm package)
npm install chatpulse

# Optional: Install whatsapp-web.js for real connection bridge
npm install whatsapp-web.js qrcode-terminal
```

## Usage

### Basic ChatPulse Bot

```javascript
import { WhatsApp } from 'chatpulse';

const client = new WhatsApp({
    sessionId: 'my-bot',
    logLevel: 'info'
});

// Listen for QR code
client.on('qr', (qr) => {
    console.log('Scan QR:', qr);
});

// Listen for messages
client.on('messages.upsert', ({ messages }) => {
    for (const message of messages) {
        console.log('Received:', message);
    }
});

// Connect
await client.connect();

// Send message
await client.sendMessage('1234567890@s.whatsapp.net', 'Hello from ChatPulse!');
```

### Running the Example

```bash
# Run the real ChatPulse bot
node example/chatpulse-real-bot.js
```

## Features

✅ **Real WhatsApp Connection** - Works with actual WhatsApp servers
✅ **ChatPulse Architecture** - Clean, modular design
✅ **Command System** - Easy command handling
✅ **Event-Driven** - Reactive message handling
✅ **Session Management** - Persistent sessions
✅ **Error Handling** - Robust error management
✅ **Logging** - Comprehensive logging system

## Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!help` | Show all commands | `!help` |
| `!ping` | Check response time | `!ping` |
| `!echo` | Echo your message | `!echo Hello World` |
| `!info` | Bot information | `!info` |
| `!status` | Detailed status | `!status` |
| `!test` | Test functionality | `!test` |

## How It Works

The implementation creates a bridge between ChatPulse's clean architecture and real WhatsApp functionality:

1. **RealWhatsAppClient** - Bridges ChatPulse with working WhatsApp implementation
2. **Automatic Fallback** - Uses whatsapp-web.js if available, simulation mode otherwise
3. **Event Translation** - Converts real WhatsApp events to ChatPulse format
4. **Consistent API** - Maintains ChatPulse's clean API

## Configuration

```javascript
const client = new WhatsApp({
    sessionId: 'my-bot',           // Unique session identifier
    sessionDir: './sessions',      // Session storage directory
    logLevel: 'info',             // Logging level
    enableFileLogging: true,      // Enable file logging
    autoReconnect: true,          // Auto-reconnect on disconnect
    prefix: '!',                  // Command prefix
    adminNumbers: ['1234567890']  // Admin phone numbers
});
```

## Connection Modes

### 1. Real Mode (with whatsapp-web.js)
- Connects to actual WhatsApp servers
- Requires QR code scanning
- Full WhatsApp functionality

### 2. Simulation Mode (fallback)
- Simulates WhatsApp connection
- For development and testing
- No real WhatsApp connection

## Adding Custom Commands

```javascript
// Add to your bot
const commands = {
    mycommand: {
        description: 'My custom command',
        handler: async (message, args) => {
            await client.sendMessage(
                message.key.remoteJid, 
                'Custom command executed!'
            );
        }
    }
};
```

## Error Handling

The bot includes comprehensive error handling:

```javascript
client.on('error', (error) => {
    console.error('Bot error:', error.message);
    
    if (error.code === 'CONNECTION_FAILED') {
        console.log('Retrying connection...');
    }
});
```

## Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start example/chatpulse-real-bot.js --name "chatpulse-bot"
pm2 save
pm2 startup
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "example/chatpulse-real-bot.js"]
```

## Troubleshooting

### Common Issues

1. **"whatsapp-web.js not available"**
   - Install: `npm install whatsapp-web.js`
   - Bot will use simulation mode without it

2. **QR Code not showing**
   - Install: `npm install qrcode-terminal`
   - Check console output

3. **Connection fails**
   - Ensure stable internet connection
   - Check WhatsApp Web is not open in browser
   - Try restarting the bot

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug node example/chatpulse-real-bot.js
```

## Architecture

```
ChatPulse Bot
├── WhatsApp (main client)
├── RealWhatsAppClient (bridge)
├── MessageHandler (message processing)
├── Command System (command routing)
├── Event System (reactive events)
└── Logger (comprehensive logging)
```

## Contributing

To extend ChatPulse functionality:

1. Add new handlers in `src/handlers/`
2. Extend `RealWhatsAppClient` for new features
3. Update command system in your bot
4. Add tests for new functionality

## Support

- **ChatPulse Issues**: Check the main ChatPulse repository
- **WhatsApp Connection**: Ensure whatsapp-web.js is properly installed
- **Bot Logic**: Modify the command handlers in your bot file

## License

MIT License - Use freely for your projects!