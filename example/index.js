/**
 * ChatPulse WhatsApp Bot Example
 * Pure implementation using only ChatPulse npm package
 * 
 * Installation:
 * npm install chatpulse
 * 
 * Usage:
 * node example/index.js
 */

import { WhatsApp } from 'chatpulse';

// Bot configuration
const BOT_CONFIG = {
    sessionId: 'chatpulse-bot',
    prefix: '!',
    adminNumbers: ['1234567890'], // Add your phone number here
    welcomeMessage: 'Hello! I am a ChatPulse WhatsApp bot. Type !help for commands.',
    logLevel: 'info',
    enableFileLogging: true
};

// Initialize ChatPulse client
const client = new WhatsApp({
    sessionId: BOT_CONFIG.sessionId,
    sessionDir: './sessions',
    logLevel: BOT_CONFIG.logLevel,
    enableFileLogging: BOT_CONFIG.enableFileLogging,
    autoReconnect: true
});

// Command registry
const commands = {
    help: {
        description: 'Show available commands',
        handler: async (message, args) => {
            let helpText = '🤖 *ChatPulse Bot Commands*\n\n';
            
            Object.entries(commands).forEach(([cmd, info]) => {
                helpText += `${BOT_CONFIG.prefix}${cmd} - ${info.description}\n`;
            });
            
            helpText += '\n_Powered by ChatPulse_';
            
            await client.sendMessage(message.key.remoteJid, helpText);
        }
    },
    
    ping: {
        description: 'Check bot response time',
        handler: async (message, args) => {
            const startTime = Date.now();
            await client.sendMessage(message.key.remoteJid, '🏓 Pong!');
            const endTime = Date.now();
            
            await client.sendMessage(
                message.key.remoteJid, 
                `⚡ Response time: ${endTime - startTime}ms`
            );
        }
    },
    
    echo: {
        description: 'Echo your message',
        handler: async (message, args) => {
            if (args.length === 0) {
                await client.sendMessage(
                    message.key.remoteJid, 
                    '❓ Please provide a message to echo.\nExample: !echo Hello World'
                );
                return;
            }
            
            const echoText = args.join(' ');
            await client.sendMessage(message.key.remoteJid, `🔊 Echo: ${echoText}`);
        }
    },
    
    info: {
        description: 'Get bot information',
        handler: async (message, args) => {
            const state = client.getConnectionState();
            
            let infoText = `🤖 *ChatPulse Bot Information*

📱 *Status:* ${state.isConnected ? 'Connected' : 'Disconnected'}
🔐 *Authenticated:* ${state.isAuthenticated ? 'Yes' : 'No'}
📦 *Library:* ChatPulse v1.0.0
🎭 *Mode:* ${state.simulationMode ? 'Simulation' : 'Real Protocol'}
⚡ *Uptime:* ${Math.floor(process.uptime())} seconds
🔧 *Protocol:* ${state.protocolStatus.implemented ? 'Implemented' : 'Not Implemented'}

_Built with ChatPulse_`;

            await client.sendMessage(message.key.remoteJid, infoText);
        }
    },
    
    test: {
        description: 'Test ChatPulse functionality',
        handler: async (message, args) => {
            await client.sendMessage(
                message.key.remoteJid, 
                '🧪 ChatPulse Test:\n✅ Message sending works\n✅ Command parsing works\n✅ Event handling works'
            );
        }
    }
};

// Event: QR Code for authentication
client.on('qr', (qr) => {
    console.log('📱 QR Code received from ChatPulse!');
    console.log('QR Code:', qr);
    console.log('\n📱 Instructions:');
    console.log('1. Open WhatsApp on your phone');
    console.log('2. Go to Settings > Linked Devices');
    console.log('3. Tap "Link a Device"');
    console.log('4. Scan the QR code above');
    console.log('\n⏰ QR code will be auto-processed in 5 seconds for demo...\n');
});

// Event: Connection updates
client.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
        console.log('❌ Connection closed');
        
        if (lastDisconnect?.error) {
            console.log('📋 Error details:', lastDisconnect.error.message || lastDisconnect.error);
        }
    } else if (connection === 'open') {
        console.log('✅ Connected to WhatsApp using ChatPulse!');
        console.log('🤖 ChatPulse bot is now active and ready to receive messages');
        console.log('🎭 Running in simulation mode for demonstration');
    }
});

// Event: Incoming messages
client.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const message of messages) {
        await handleMessage(message);
    }
});

// Event: Errors
client.on('error', (error) => {
    console.error('❌ Bot error:', error.message);
});

/**
 * Handle incoming messages
 */
async function handleMessage(message) {
    try {
        // Skip if message is from bot itself
        if (message.key?.fromMe) return;
        
        const messageText = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || '';
        
        const senderNumber = message.key.remoteJid.split('@')[0];
        const isGroup = message.key.remoteJid.endsWith('@g.us');
        const chatId = message.key.remoteJid;
        
        console.log(`📨 Message from ${senderNumber}: ${messageText}`);
        
        // Check if message starts with bot prefix
        if (!messageText.startsWith(BOT_CONFIG.prefix)) {
            // Send welcome message for first-time users (non-command messages)
            if (!isGroup && messageText.toLowerCase().includes('hello')) {
                await client.sendMessage(chatId, BOT_CONFIG.welcomeMessage);
            }
            return;
        }
        
        // Parse command
        const args = messageText.slice(BOT_CONFIG.prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();
        const commandArgs = args.slice(1);
        
        // Handle commands
        if (commands[command]) {
            console.log(`🔧 Executing command: ${command}`);
            await commands[command].handler(message, commandArgs);
        } else {
            await client.sendMessage(
                chatId, 
                `❓ Unknown command: ${command}\nType ${BOT_CONFIG.prefix}help for available commands.`
            );
        }
        
    } catch (error) {
        console.error('Error handling message:', error);
    }
}

/**
 * Start the bot
 */
async function startBot() {
    try {
        console.log('🚀 Starting ChatPulse WhatsApp Bot...');
        console.log('📦 Using ChatPulse npm package');
        console.log('⚙️ Configuration:', {
            sessionId: BOT_CONFIG.sessionId,
            prefix: BOT_CONFIG.prefix,
            logLevel: BOT_CONFIG.logLevel
        });
        console.log('🎭 Will run in simulation mode for demonstration');
        console.log('');
        
        await client.connect();
        
        // Wait a bit for simulation mode to fully initialize
        setTimeout(() => {
            console.log('🎮 Bot is ready! Try sending messages in simulation mode.');
            console.log('📝 Available commands: !help, !ping, !echo, !info, !test');
        }, 3000);
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down ChatPulse bot...');
    try {
        await client.disconnect();
        console.log('✅ Bot disconnected successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bot
startBot();