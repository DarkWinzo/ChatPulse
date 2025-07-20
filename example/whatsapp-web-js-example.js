/**
 * Real WhatsApp Bot using whatsapp-web.js
 * This is a working example that connects to real WhatsApp
 * 
 * Installation:
 * npm install whatsapp-web.js qrcode-terminal
 * 
 * Usage:
 * node whatsapp-web-js-example.js
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Bot configuration
const BOT_CONFIG = {
    prefix: '!',
    adminNumbers: ['1234567890@c.us'], // Add admin phone numbers here (format: number@c.us)
    welcomeMessage: 'Hello! I am a WhatsApp bot powered by whatsapp-web.js. Type !help for available commands.',
    commands: {
        help: 'Show available commands',
        ping: 'Check bot response time',
        echo: 'Echo your message',
        info: 'Get bot information',
        sticker: 'Convert image to sticker',
        quote: 'Quote a message',
        everyone: 'Mention everyone in group (admin only)'
    }
};

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-bot"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Event: QR Code for authentication
client.on('qr', (qr) => {
    console.log('📱 QR Code received! Scan with WhatsApp:');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 Or scan this QR code with WhatsApp on your phone');
    console.log('⏰ QR code will expire in 20 seconds...\n');
});

// Event: Client ready
client.on('ready', () => {
    console.log('✅ WhatsApp bot is ready and connected!');
    console.log('🤖 Bot is now active and ready to receive messages');
    
    // Get bot info
    client.getState().then(state => {
        console.log('📱 Connection state:', state);
    });
});

// Event: Authentication success
client.on('authenticated', () => {
    console.log('🔐 Authentication successful!');
});

// Event: Authentication failure
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
});

// Event: Client disconnected
client.on('disconnected', (reason) => {
    console.log('❌ Client was logged out:', reason);
});

// Event: Incoming messages
client.on('message', async (message) => {
    try {
        await handleMessage(message);
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// Event: Message acknowledgment (message status updates)
client.on('message_ack', (msg, ack) => {
    /*
        ack values:
        1: Message sent
        2: Message delivered
        3: Message read
    */
    if (ack === 3) {
        console.log(`✅ Message ${msg.id._serialized} was read`);
    }
});

// Event: Group join
client.on('group_join', (notification) => {
    console.log('👥 Someone joined a group:', notification);
    
    // Send welcome message to new member
    const chat = notification.chatId;
    const welcomeMsg = `Welcome to the group! 👋\nType ${BOT_CONFIG.prefix}help to see available commands.`;
    client.sendMessage(chat, welcomeMsg);
});

/**
 * Handle incoming messages
 */
async function handleMessage(message) {
    // Skip if message is from bot itself
    if (message.fromMe) return;
    
    // Skip if message is a status update
    if (message.isStatus) return;
    
    const messageBody = message.body || '';
    const senderNumber = message.from;
    const isGroup = message.from.endsWith('@g.us');
    const chat = await message.getChat();
    
    console.log(`📨 Message from ${senderNumber}: ${messageBody}`);
    
    // Check if message starts with bot prefix
    if (!messageBody.startsWith(BOT_CONFIG.prefix)) {
        // Send welcome message for first-time users (non-command messages)
        if (!isGroup && messageBody.toLowerCase().includes('hello')) {
            await message.reply(BOT_CONFIG.welcomeMessage);
        }
        return;
    }
    
    // Parse command
    const args = messageBody.slice(BOT_CONFIG.prefix.length).trim().split(' ');
    const command = args[0].toLowerCase();
    
    // Handle commands
    await handleCommand(command, args.slice(1), message, chat);
}

/**
 * Handle bot commands
 */
async function handleCommand(command, args, message, chat) {
    try {
        switch (command) {
            case 'help':
                await handleHelpCommand(message);
                break;
                
            case 'ping':
                await handlePingCommand(message);
                break;
                
            case 'echo':
                await handleEchoCommand(message, args);
                break;
                
            case 'info':
                await handleInfoCommand(message, chat);
                break;
                
            case 'sticker':
                await handleStickerCommand(message);
                break;
                
            case 'quote':
                await handleQuoteCommand(message);
                break;
                
            case 'everyone':
                await handleEveryoneCommand(message, chat);
                break;
                
            case 'admin':
                if (BOT_CONFIG.adminNumbers.includes(message.from)) {
                    await handleAdminCommand(message, args);
                } else {
                    await message.reply('❌ You are not authorized to use admin commands.');
                }
                break;
                
            default:
                await message.reply(`❓ Unknown command: ${command}\nType ${BOT_CONFIG.prefix}help for available commands.`);
        }
    } catch (error) {
        console.error(`Error handling command ${command}:`, error);
        await message.reply('❌ An error occurred while processing your command.');
    }
}

/**
 * Command handlers
 */
async function handleHelpCommand(message) {
    let helpText = '🤖 *WhatsApp Bot Commands*\n\n';
    
    for (const [cmd, description] of Object.entries(BOT_CONFIG.commands)) {
        helpText += `${BOT_CONFIG.prefix}${cmd} - ${description}\n`;
    }
    
    helpText += `\n_Powered by whatsapp-web.js_`;
    
    await message.reply(helpText);
}

async function handlePingCommand(message) {
    const startTime = Date.now();
    const reply = await message.reply('🏓 Pong!');
    const endTime = Date.now();
    
    await reply.edit(`🏓 Pong!\n⚡ Response time: ${endTime - startTime}ms`);
}

async function handleEchoCommand(message, args) {
    if (args.length === 0) {
        await message.reply('❓ Please provide a message to echo.\nExample: !echo Hello World');
        return;
    }
    
    const echoText = args.join(' ');
    await message.reply(`🔊 Echo: ${echoText}`);
}

async function handleInfoCommand(message, chat) {
    const contact = await message.getContact();
    const chatInfo = chat.isGroup ? await chat.getInviteCode() : 'Individual chat';
    
    let infoText = `🤖 *Bot Information*

📱 *Status:* Online
🔐 *Mode:* Production
📦 *Library:* whatsapp-web.js
⚡ *Uptime:* ${Math.floor(process.uptime())} seconds
👤 *Your Number:* ${contact.number}
💬 *Chat Type:* ${chat.isGroup ? 'Group' : 'Individual'}`;

    if (chat.isGroup) {
        infoText += `\n👥 *Group Members:* ${chat.participants.length}`;
    }

    await message.reply(infoText);
}

async function handleStickerCommand(message) {
    if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        
        if (quotedMsg.hasMedia) {
            const media = await quotedMsg.downloadMedia();
            
            if (media.mimetype.startsWith('image/')) {
                await message.reply(media, message.from, { sendMediaAsSticker: true });
            } else {
                await message.reply('❌ Please quote an image to convert to sticker.');
            }
        } else {
            await message.reply('❌ Please quote an image to convert to sticker.');
        }
    } else if (message.hasMedia) {
        const media = await message.downloadMedia();
        
        if (media.mimetype.startsWith('image/')) {
            await message.reply(media, message.from, { sendMediaAsSticker: true });
        } else {
            await message.reply('❌ Please send an image to convert to sticker.');
        }
    } else {
        await message.reply('❌ Please send or quote an image to convert to sticker.');
    }
}

async function handleQuoteCommand(message) {
    if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        const quotedContact = await quotedMsg.getContact();
        
        await message.reply(`📝 *Quoted Message:*\n\n"${quotedMsg.body}"\n\n_- ${quotedContact.pushname || quotedContact.number}_`);
    } else {
        await message.reply('❓ Please quote a message to use this command.');
    }
}

async function handleEveryoneCommand(message, chat) {
    if (!chat.isGroup) {
        await message.reply('❌ This command can only be used in groups.');
        return;
    }
    
    // Check if user is group admin
    const participant = chat.participants.find(p => p.id._serialized === message.author);
    if (!participant || !participant.isAdmin) {
        await message.reply('❌ Only group admins can use this command.');
        return;
    }
    
    // Mention everyone
    let mentions = [];
    let mentionText = '📢 *Attention Everyone!*\n\n';
    
    for (let participant of chat.participants) {
        mentions.push(participant.id._serialized);
        mentionText += `@${participant.id.user} `;
    }
    
    await chat.sendMessage(mentionText, { mentions });
}

async function handleAdminCommand(message, args) {
    if (args.length === 0) {
        await message.reply('🔧 *Admin Commands*\n\n!admin status - Bot status\n!admin broadcast <message> - Broadcast to all chats');
        return;
    }
    
    const adminCmd = args[0].toLowerCase();
    
    switch (adminCmd) {
        case 'status':
            const chats = await client.getChats();
            const contacts = await client.getContacts();
            
            const stats = {
                uptime: Math.floor(process.uptime()),
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                chats: chats.length,
                contacts: contacts.length
            };
            
            await message.reply(`📊 *Bot Status*\n\nUptime: ${stats.uptime}s\nMemory: ${stats.memory}MB\nChats: ${stats.chats}\nContacts: ${stats.contacts}`);
            break;
            
        case 'broadcast':
            if (args.length < 2) {
                await message.reply('❓ Usage: !admin broadcast <message>');
                return;
            }
            
            const broadcastMsg = args.slice(1).join(' ');
            const allChats = await client.getChats();
            let sentCount = 0;
            
            await message.reply('📡 Starting broadcast...');
            
            for (let chat of allChats) {
                try {
                    await chat.sendMessage(`📢 *Broadcast Message*\n\n${broadcastMsg}`);
                    sentCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                } catch (error) {
                    console.error('Broadcast error:', error);
                }
            }
            
            await message.reply(`✅ Broadcast sent to ${sentCount} chats.`);
            break;
            
        default:
            await message.reply('❓ Unknown admin command.');
    }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bot...');
    try {
        await client.destroy();
        console.log('✅ Bot disconnected successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the bot
console.log('🚀 Starting WhatsApp Bot...');
console.log('📱 Please scan the QR code with your WhatsApp mobile app');
client.initialize();