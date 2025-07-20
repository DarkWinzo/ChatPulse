# ChatPulse - Pure WhatsApp Web API Library

**ChatPulse** is a pure WhatsApp Web API library built with JavaScript (Node.js). It provides a clean, standalone WhatsApp bot framework with **zero external WhatsApp dependencies**.

## 🚀 Features

- **Pure Implementation** - No external WhatsApp libraries required
- **Built-in Protocol** - Basic WhatsApp Web protocol implementation
- **Simulation Mode** - Perfect for development and testing
- **Clean Architecture** - Modular, maintainable design
- **Event System** - Reactive message handling
- **Command Framework** - Easy command registration and handling
- **Session Management** - Persistent session storage
- **Comprehensive Logging** - Built-in logging system

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

## 📖 Quick Example

```bash
# Run the example bot
node example/pure-chatpulse-bot.js
```

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

This library is not affiliated with WhatsApp Inc. It's an independent implementation for educational and development purposes. The library includes simulation mode for safe development and testing.

## 🙏 Acknowledgments

- WhatsApp for the messaging platform
- The open-source community for inspiration

---

**© 2025 DarkSide Developers Team. All rights reserved.**