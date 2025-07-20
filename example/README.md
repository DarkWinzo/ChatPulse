# ChatPulse WhatsApp Bot Example

This is a complete example of a WhatsApp bot built using the ChatPulse library.

## Features

- 🤖 **Command System** - Prefix-based commands (!help, !ping, etc.)
- 📱 **QR Authentication** - Easy setup with QR code scanning
- 🔄 **Auto Reconnection** - Automatic reconnection on disconnect
- 👥 **Group Support** - Works in both individual and group chats
- 🔘 **Interactive Messages** - Buttons, lists, and polls
- 👑 **Admin Commands** - Special commands for authorized users
- 📊 **Bot Statistics** - Monitor bot performance
- 🛡️ **Error Handling** - Robust error handling and logging

## Installation

1. Clone or download this example
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Open `index.js`
2. Update the `BOT_CONFIG` object:
   ```javascript
   const BOT_CONFIG = {
       prefix: '!',
       adminNumbers: ['1234567890'], // Add your phone number here
       welcomeMessage: 'Hello! I am a ChatPulse bot...',
       // ... other config
   };
   ```

## Usage

1. Start the bot:
   ```bash
   npm start
   ```

2. Scan the QR code with WhatsApp

3. Send commands to the bot:
   - `!help` - Show available commands
   - `!ping` - Check bot response time
   - `!echo Hello World` - Echo your message
   - `!info` - Get bot information
   - `!poll "Favorite Color?" Red Blue Green` - Create a poll
   - `!buttons` - Show interactive buttons
   - `!list` - Show selection list

## Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!help` | Show all available commands | `!help` |
| `!ping` | Check bot response time | `!ping` |
| `!echo` | Echo your message | `!echo Hello World` |
| `!info` | Get bot information | `!info` |
| `!poll` | Create a poll | `!poll "Best fruit?" Apple Orange Banana` |
| `!buttons` | Show button example | `!buttons` |
| `!list` | Show list example | `!list` |
| `!admin` | Admin commands (authorized users only) | `!admin status` |

## Admin Commands

For users listed in `adminNumbers`:

- `!admin status` - Show bot status
- `!admin restart` - Restart the bot

## File Structure

```
example/
├── index.js          # Main bot file
├── package.json      # Dependencies and scripts
├── README.md         # This file
└── sessions/         # Session storage (auto-created)
```

## Customization

### Adding New Commands

1. Add command to `BOT_CONFIG.commands`
2. Add case in `handleCommand()` function
3. Create handler function

Example:
```javascript
// In BOT_CONFIG.commands
time: 'Get current time'

// In handleCommand()
case 'time':
    await handleTimeCommand(chatId);
    break;

// Handler function
async function handleTimeCommand(chatId) {
    const now = new Date().toLocaleString();
    await client.sendMessage(chatId, `🕐 Current time: ${now}`);
}
```

### Customizing Responses

Edit the response messages in the handler functions to match your bot's personality.

### Adding Media Support

```javascript
// Send image
await client.sendImage(chatId, './path/to/image.jpg', 'Caption');

// Send video
await client.sendVideo(chatId, './path/to/video.mp4', 'Caption');

// Send audio
await client.sendAudio(chatId, './path/to/audio.mp3');

// Send document
await client.sendDocument(chatId, './path/to/file.pdf', 'filename.pdf');
```

## Troubleshooting

### QR Code Issues
- Make sure WhatsApp Web is not open in browser
- Try restarting the bot if QR doesn't appear
- Check your internet connection

### Connection Problems
- Verify your internet connection
- Check if WhatsApp servers are accessible
- Review console logs for error details

### Command Not Working
- Ensure message starts with correct prefix (default: `!`)
- Check for typos in command names
- Verify bot has necessary permissions in groups

## Support

For issues with the ChatPulse library, visit:
- GitHub: https://github.com/DarkSide-Developers/ChatPulse
- Documentation: See main README.md

## License

MIT License - feel free to modify and use for your projects!