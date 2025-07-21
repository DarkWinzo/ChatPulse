# ChatPulse - Pure WhatsApp Web API Library

**ChatPulse** is a demonstration WhatsApp Web API library built with JavaScript (Node.js). It shows the basic structure and concepts of WhatsApp Web protocol implementation.

## ⚠️ Important Notice

**ChatPulse is a demonstration library** that shows how WhatsApp Web protocol might work. However, **WhatsApp servers reject unofficial clients**, so this library cannot connect to real WhatsApp servers.

### For Real WhatsApp Integration, Use:

1. **[Baileys](https://github.com/WhiskeySockets/Baileys)** - Most complete unofficial WhatsApp Web API
2. **[whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)** - Puppeteer-based WhatsApp Web API
3. **[WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)** - Official WhatsApp API

## 🚀 Features

- **Educational Purpose** - Learn WhatsApp Web protocol concepts
- **Clean Architecture** - Well-structured codebase for learning
- **Protocol Demonstration** - Shows how WhatsApp Web protocol works
- **Clean Architecture** - Modular, maintainable design
- **Event System** - Reactive message handling
- **Command Framework** - Easy command registration and handling
- **Session Management** - Persistent session storage
- **Comprehensive Logging** - Built-in logging system

## 📦 Installation

```bash
npm install chatpulse
```

## 🔧 Quick Start (Educational/Demo)

```javascript
import { WhatsApp } from 'chatpulse';

const client = new WhatsApp({
    sessionId: 'my-session',
    logLevel: 'info'
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

## 🎮 Demo Mode

Since WhatsApp rejects unofficial clients, ChatPulse includes a demo mode for learning:

```bash
# Run the demo bot
node example/pure-chatpulse-bot.js
```

## 🔧 For Real WhatsApp Bots

### Option 1: Baileys (Recommended)
```bash
npm install @whiskeysockets/baileys
```

### Option 2: whatsapp-web.js
```bash
npm install whatsapp-web.js
```

### Option 3: WhatsApp Business API
Use the official WhatsApp Business API for production applications.

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

This library is not affiliated with WhatsApp Inc. It's an educational implementation showing WhatsApp Web protocol concepts. **WhatsApp servers reject unofficial clients**, so this library cannot connect to real WhatsApp.

For real WhatsApp integration, use official APIs or established libraries like Baileys or whatsapp-web.js.

## 🙏 Acknowledgments

- WhatsApp for the messaging platform
- The open-source community for inspiration
- Baileys and whatsapp-web.js for real WhatsApp integration solutions

---

**© 2025 DarkSide Developers Team. All rights reserved.**