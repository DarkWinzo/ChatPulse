/**
 * ChatPulse WhatsApp Bot Example
 * This example demonstrates how to create a simple WhatsApp bot using the ChatPulse library
 * 
 * Installation:
 * npm install chatpulse
 * 
 * Usage:
 * node example/index.js
 */

import { WhatsApp } from 'chatpulse';

// Initialize WhatsApp client
const client = new WhatsApp({
    sessionId: 'example-bot',
    sessionDir: './sessions',
    logLevel: 'info',
    enableFileLogging: true,
    autoReconnect: true,
    qrTimeout: 60000
});

// Bot configuration
const BOT_CONFIG = {
    prefix: '!',
    adminNumbers: ['1234567890'], // Add admin phone numbers here
    welcomeMessage: 'Hello! I am a ChatPulse bot. Type !help for available commands.',
    commands: {
        help: 'Show available commands',
        ping: 'Check bot response time',
        echo: 'Echo your message',
        info: 'Get bot information',
        poll: 'Create a poll',
        buttons: 'Show button example',
        list: 'Show list example'
    }
};

// Event: QR Code for authentication
client.on('qr', (qr) => {
    console.log('📱 Scan this QR code with WhatsApp:');
    console.log(qr);
    console.log('\nOr use a QR code scanner app to scan the code above.');
});

// Event: Connection updates
client.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        console.log('❌ Connection closed due to:', lastDisconnect?.error);
        
        if (shouldReconnect) {
            console.log('🔄 Reconnecting...');
            connectBot();
        } else {
            console.log('🚫 Please scan QR code again');
        }
    } else if (connection === 'open') {
        console.log('✅ Connected to WhatsApp successfully!');
        console.log('🤖 Bot is now active and ready to receive messages');
    }
});

// Event: Authentication success
client.on('auth.success', (credentials) => {
    console.log('🔐 Authentication successful');
});

// Event: Authentication failed
client.on('auth.failed', (error) => {
    console.log('❌ Authentication failed:', error.message);
});

// Event: Incoming messages
client.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const message of messages) {
        await handleMessage(message);
    }
});

// Event: Message reactions
client.on('messages.reaction', ({ key, reaction }) => {
    console.log(`👍 Reaction received: ${reaction.text} on message ${key.id}`);
});

// Event: Presence updates (typing, online status)
client.on('presence.update', ({ id, presences }) => {
    console.log(`👤 Presence update for ${id}:`, presences);
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
        
        // Handle commands
        await handleCommand(command, args.slice(1), chatId, senderNumber, message);
        
    } catch (error) {
        console.error('Error handling message:', error);
    }
}

/**
 * Handle bot commands
 */
async function handleCommand(command, args, chatId, senderNumber, originalMessage) {
    try {
        switch (command) {
            case 'help':
                await handleHelpCommand(chatId);
                break;
                
            case 'ping':
                await handlePingCommand(chatId);
                break;
                
            case 'echo':
                await handleEchoCommand(chatId, args);
                break;
                
            case 'info':
                await handleInfoCommand(chatId);
                break;
                
            case 'poll':
                await handlePollCommand(chatId, args);
                break;
                
            case 'buttons':
                await handleButtonsCommand(chatId);
                break;
                
            case 'list':
                await handleListCommand(chatId);
                break;
                
            case 'admin':
                if (BOT_CONFIG.adminNumbers.includes(senderNumber)) {
                    await handleAdminCommand(chatId, args);
                } else {
                    await client.sendMessage(chatId, '❌ You are not authorized to use admin commands.');
                }
                break;
                
            default:
                await client.sendMessage(chatId, `❓ Unknown command: ${command}\nType ${BOT_CONFIG.prefix}help for available commands.`);
        }
    } catch (error) {
        console.error(`Error handling command ${command}:`, error);
        await client.sendMessage(chatId, '❌ An error occurred while processing your command.');
    }
}

/**
 * Command handlers
 */
async function handleHelpCommand(chatId) {
    let helpText = '🤖 *ChatPulse Bot Commands*\n\n';
    
    for (const [cmd, description] of Object.entries(BOT_CONFIG.commands)) {
        helpText += `${BOT_CONFIG.prefix}${cmd} - ${description}\n`;
    }
    
    helpText += `\n_Powered by ChatPulse WhatsApp API_`;
    
    await client.sendMessage(chatId, helpText);
}

async function handlePingCommand(chatId) {
    const startTime = Date.now();
    await client.sendMessage(chatId, '🏓 Pong!');
    const endTime = Date.now();
    
    await client.sendMessage(chatId, `⚡ Response time: ${endTime - startTime}ms`);
}

async function handleEchoCommand(chatId, args) {
    if (args.length === 0) {
        await client.sendMessage(chatId, '❓ Please provide a message to echo.\nExample: !echo Hello World');
        return;
    }
    
    const echoText = args.join(' ');
    await client.sendMessage(chatId, `🔊 Echo: ${echoText}`);
}

async function handleInfoCommand(chatId) {
    const connectionState = client.getConnectionState();
    
    const infoText = `🤖 *Bot Information*

📱 *Status:* ${connectionState.isConnected ? 'Online' : 'Offline'}
🔐 *Authenticated:* ${connectionState.isAuthenticated ? 'Yes' : 'No'}
🔗 *Connection:* ${connectionState.connection}
📦 *Library:* ChatPulse v1.0.0
⚡ *Uptime:* ${Math.floor(process.uptime())} seconds

_Developed with ChatPulse WhatsApp API_`;

    await client.sendMessage(chatId, infoText);
}

async function handlePollCommand(chatId, args) {
    if (args.length < 3) {
        await client.sendMessage(chatId, '❓ Usage: !poll <question> <option1> <option2> [option3...]');
        return;
    }
    
    const question = args[0];
    const options = args.slice(1);
    
    if (options.length < 2) {
        await client.sendMessage(chatId, '❌ Poll must have at least 2 options.');
        return;
    }
    
    await client.sendPoll(chatId, question, options, {
        multipleChoice: false
    });
}

async function handleButtonsCommand(chatId) {
    const buttons = [
        { id: 'btn1', text: '👍 Like' },
        { id: 'btn2', text: '❤️ Love' },
        { id: 'btn3', text: '😂 Haha' }
    ];
    
    await client.sendButtons(
        chatId,
        '🔘 *Button Example*\n\nChoose your reaction:',
        buttons,
        'ChatPulse Bot Demo'
    );
}

async function handleListCommand(chatId) {
    const sections = [
        {
            title: '🍕 Food',
            rows: [
                { id: 'pizza', title: 'Pizza', description: 'Delicious Italian pizza' },
                { id: 'burger', title: 'Burger', description: 'Juicy beef burger' }
            ]
        },
        {
            title: '🥤 Drinks',
            rows: [
                { id: 'coke', title: 'Coca Cola', description: 'Refreshing cola drink' },
                { id: 'water', title: 'Water', description: 'Pure mineral water' }
            ]
        }
    ];
    
    await client.sendList(
        chatId,
        '📋 *Menu Selection*\n\nChoose from our menu:',
        'View Menu',
        sections
    );
}

async function handleAdminCommand(chatId, args) {
    if (args.length === 0) {
        await client.sendMessage(chatId, '🔧 *Admin Commands*\n\n!admin status - Bot status\n!admin restart - Restart bot');
        return;
    }
    
    const adminCmd = args[0].toLowerCase();
    
    switch (adminCmd) {
        case 'status':
            const stats = {
                uptime: Math.floor(process.uptime()),
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                connection: client.getConnectionState()
            };
            
            await client.sendMessage(chatId, `📊 *Bot Status*\n\nUptime: ${stats.uptime}s\nMemory: ${stats.memory}MB\nConnection: ${stats.connection.connection}`);
            break;
            
        case 'restart':
            await client.sendMessage(chatId, '🔄 Restarting bot...');
            process.exit(0);
            break;
            
        default:
            await client.sendMessage(chatId, '❓ Unknown admin command.');
    }
}

/**
 * Connect the bot
 */
async function connectBot() {
    try {
        console.log('🚀 Starting ChatPulse WhatsApp Bot...');
        await client.connect();
    } catch (error) {
        console.error('❌ Failed to connect:', error.message);
        console.log('🔄 Retrying in 5 seconds...');
        setTimeout(connectBot, 5000);
    }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bot...');
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
connectBot();