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
import QRCode from 'qrcode';

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

// Demo mode flag - set to true for demonstration without real WhatsApp connection
const DEMO_MODE = true; // Set to false for real WhatsApp connection (requires complete protocol implementation)

if (DEMO_MODE) {
    console.log('🎭 DEMO MODE: Running ChatPulse bot example in demonstration mode');
    console.log('📝 This example shows the bot structure and event handling');
    console.log('🔧 To connect to real WhatsApp, set DEMO_MODE = false and ensure proper WhatsApp Web protocol implementation');
    console.log('⚠️  Note: The current ChatPulse implementation is a framework that requires complete WhatsApp Web protocol implementation');
    console.log('');
    
    // Simulate bot events for demonstration
    setTimeout(() => {
        console.log('📱 [DEMO] QR Code would be displayed here for real connection');
        console.log('🔗 [DEMO] QR: demo_qr_code_here');
    }, 1000);
    
    setTimeout(() => {
        console.log('✅ [DEMO] Connection established (simulated)');
        console.log('🤖 [DEMO] Bot is now active and ready to receive messages');
        
        // Simulate incoming message
        setTimeout(() => {
            simulateIncomingMessage();
        }, 2000);
    }, 2000);
    
    // Keep demo running
    setInterval(() => {
        console.log('💓 [DEMO] Bot heartbeat - still running...');
    }, 30000);
    
} else {
    // Real WhatsApp connection mode
    console.log('🚀 Starting real WhatsApp connection...');
    console.log('⚠️  IMPORTANT: This requires a complete WhatsApp Web protocol implementation');
    console.log('📋 Current status: Framework/Template - Protocol implementation needed');
    console.log('🔧 Expected behavior: Connection will likely fail due to incomplete protocol');
    console.log('💡 Recommendation: Use DEMO_MODE = true to see bot functionality');
    console.log('');
    
    // Event: QR Code for authentication
    client.on('qr', (qr) => {
        console.log('📱 QR Code received! Generating scannable QR...\n');
        
        // Display QR code in terminal
        QRCode.toString(qr, { type: 'terminal', small: true }, (err, qrString) => {
            if (err) {
                console.error('❌ Failed to generate QR code:', err);
                console.log('📱 Raw QR data:', qr);
            } else {
                console.log('📱 Scan this QR code with WhatsApp:\n');
                console.log(qrString);
                console.log('\n🔗 Raw QR data (if terminal QR doesn\'t work):');
                console.log(qr);
                console.log('\n📱 Instructions:');
                console.log('1. Open WhatsApp on your phone');
                console.log('2. Go to Settings > Linked Devices');
                console.log('3. Tap "Link a Device"');
                console.log('4. Scan the QR code above');
                console.log('\n⏰ QR code will expire in 60 seconds...\n');
            }
        });
    });

    // Event: QR code expired
    client.on('qr.expired', () => {
        console.log('⏰ QR code expired! Generating new one...');
    });

    // Event: Connection updates
    client.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            console.log('❌ Connection closed');
            
            if (lastDisconnect?.error) {
                console.log('📋 Error details:', lastDisconnect.error.message || lastDisconnect.error);
                
                // Check for specific WhatsApp protocol errors
                if (lastDisconnect.error.message?.includes('Text Frames are not supported')) {
                    console.log('');
                    console.log('🔍 DIAGNOSIS: WhatsApp server rejected the connection');
                    console.log('💡 REASON: Incomplete WhatsApp Web protocol implementation');
                    console.log('🛠️  SOLUTION: This is expected behavior for the current framework');
                    console.log('📝 RECOMMENDATION: Set DEMO_MODE = true to see bot functionality');
                    console.log('');
                    return; // Don't attempt reconnection for protocol errors
                }
            }
            
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            
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
        console.log(''); // Add spacing for better readability
        console.error('❌ Bot error:', error.message);
        
        // Handle specific errors
        if (error.code === 'CONNECTION_FAILED') {
            console.log('🔧 Connection failed - check your internet connection');
        } else if (error.code === 'AUTH_FAILED') {
            console.log('🔧 Authentication failed - please scan QR code again');
        } else if (error.code === 'PROTOCOL_REJECTED') {
            console.log('');
            console.log('🚫 WHATSAPP PROTOCOL REJECTION:');
            console.log('📋 Server Response:', error.message);
            console.log('💡 EXPLANATION: WhatsApp servers rejected the connection');
            console.log('🔍 TECHNICAL REASON: The WebSocket protocol implementation is incomplete');
            console.log('🛠️  CURRENT STATUS: ChatPulse is a framework/template requiring full protocol implementation');
            console.log('✅ RECOMMENDED ACTION: Set DEMO_MODE = true to see bot functionality');
            console.log('📚 FOR DEVELOPERS: Implement complete WhatsApp Web binary protocol to enable real connections');
            console.log('');
            console.log('🛑 Exiting to prevent connection loops...');
            process.exit(0);
        } else if (error.code === 'INVALID_MESSAGE') {
            console.log('');
            console.log('🔍 PROTOCOL ERROR DETECTED:');
            console.log('📋 WhatsApp server message: "Text Frames are not supported"');
            console.log('💡 EXPLANATION: WhatsApp rejected the connection due to protocol incompatibility');
            console.log('🛠️  ROOT CAUSE: ChatPulse is a framework that needs complete WhatsApp Web protocol implementation');
            console.log('✅ SOLUTION: Set DEMO_MODE = true to see bot functionality without real WhatsApp connection');
            console.log('📝 NOTE: This error is expected and normal for the current implementation');
            console.log('');
            
            // Prevent further connection attempts for protocol errors
            console.log('🛑 Stopping connection attempts due to protocol incompatibility...');
            process.exit(0);
        }
    });
    
    // Event: Protocol rejection (specific handler)
    client.on('protocol.rejected', (error) => {
        console.log('');
        console.log('🚫 PROTOCOL REJECTION EVENT:');
        console.log('📋 WhatsApp servers have rejected the connection');
        console.log('🔍 This confirms that the current implementation is incomplete');
        console.log('💡 Switch to DEMO_MODE = true to see how the bot would work');
        console.log('');
    });
}

/**
 * Simulate incoming message for demo
 */
function simulateIncomingMessage() {
    console.log('📨 [DEMO] Simulating incoming message...');
    
    // Test different commands
    const testCommands = ['!help', '!ping', '!echo Hello World', '!info', '!poll "Favorite Color?" Red Blue Green'];
    
    testCommands.forEach((command, index) => {
        setTimeout(() => {
            const demoMessage = {
                key: {
                    fromMe: false,
                    remoteJid: '1234567890@s.whatsapp.net'
                },
                message: {
                    conversation: command
                }
            };
            
            console.log(`📨 Message from 1234567890: ${command}`);
            handleMessage(demoMessage);
        }, index * 3000); // 3 second delay between commands
    });
}

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
        
        console.log(`📨 Processing message from ${senderNumber}: ${messageText}`);
        
        // Check if message starts with bot prefix
        if (!messageText.startsWith(BOT_CONFIG.prefix)) {
            // Send welcome message for first-time users (non-command messages)
            if (!isGroup && messageText.toLowerCase().includes('hello')) {
                await sendMessage(chatId, BOT_CONFIG.welcomeMessage);
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
                    await sendMessage(chatId, '❌ You are not authorized to use admin commands.');
                }
                break;
                
            default:
                await sendMessage(chatId, `❓ Unknown command: ${command}\nType ${BOT_CONFIG.prefix}help for available commands.`);
        }
    } catch (error) {
        console.error(`Error handling command ${command}:`, error);
        await sendMessage(chatId, '❌ An error occurred while processing your command.');
    }
}

/**
 * Send message wrapper (handles both demo and real mode)
 */
async function sendMessage(chatId, text) {
    if (DEMO_MODE) {
        console.log(`📤 [DEMO] Sending to ${chatId}: ${text}`);
        return { success: true, demo: true };
    } else {
        return await client.sendMessage(chatId, text);
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
    
    await sendMessage(chatId, helpText);
}

async function handlePingCommand(chatId) {
    const startTime = Date.now();
    await sendMessage(chatId, '🏓 Pong!');
    const endTime = Date.now();
    
    await sendMessage(chatId, `⚡ Response time: ${endTime - startTime}ms`);
}

async function handleEchoCommand(chatId, args) {
    if (args.length === 0) {
        await sendMessage(chatId, '❓ Please provide a message to echo.\nExample: !echo Hello World');
        return;
    }
    
    const echoText = args.join(' ');
    await sendMessage(chatId, `🔊 Echo: ${echoText}`);
}

async function handleInfoCommand(chatId) {
    let infoText = `🤖 *Bot Information*

📱 *Status:* ${DEMO_MODE ? 'Demo Mode' : 'Live Mode'}
🔐 *Mode:* ${DEMO_MODE ? 'Demonstration' : 'Production'}
📦 *Library:* ChatPulse v1.0.0
⚡ *Uptime:* ${Math.floor(process.uptime())} seconds

_Developed with ChatPulse WhatsApp API_`;

    if (!DEMO_MODE) {
        const connectionState = client.getConnectionState();
        infoText = infoText.replace('Demo Mode', connectionState.isConnected ? 'Online' : 'Offline');
        infoText = infoText.replace('Demonstration', connectionState.isAuthenticated ? 'Authenticated' : 'Not Authenticated');
    }

    await sendMessage(chatId, infoText);
}

async function handlePollCommand(chatId, args) {
    if (args.length < 3) {
        await sendMessage(chatId, '❓ Usage: !poll <question> <option1> <option2> [option3...]');
        return;
    }
    
    const question = args[0];
    const options = args.slice(1);
    
    if (options.length < 2) {
        await sendMessage(chatId, '❌ Poll must have at least 2 options.');
        return;
    }
    
    if (DEMO_MODE) {
        console.log(`📊 [DEMO] Creating poll: "${question}" with options: ${options.join(', ')}`);
        await sendMessage(chatId, `📊 Poll created: "${question}"\nOptions: ${options.join(', ')}`);
    } else {
        await client.sendPoll(chatId, question, options, {
            multipleChoice: false
        });
    }
}

async function handleButtonsCommand(chatId) {
    const buttons = [
        { id: 'btn1', text: '👍 Like' },
        { id: 'btn2', text: '❤️ Love' },
        { id: 'btn3', text: '😂 Haha' }
    ];
    
    if (DEMO_MODE) {
        console.log(`🔘 [DEMO] Sending buttons: ${buttons.map(b => b.text).join(', ')}`);
        await sendMessage(chatId, `🔘 Button message would show: ${buttons.map(b => b.text).join(', ')}`);
    } else {
        await client.sendButtons(
            chatId,
            '🔘 *Button Example*\n\nChoose your reaction:',
            buttons,
            'ChatPulse Bot Demo'
        );
    }
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
    
    if (DEMO_MODE) {
        console.log(`📋 [DEMO] Sending list with ${sections.length} sections`);
        let listText = '📋 Menu Selection:\n';
        sections.forEach(section => {
            listText += `\n${section.title}:\n`;
            section.rows.forEach(row => {
                listText += `- ${row.title}: ${row.description}\n`;
            });
        });
        await sendMessage(chatId, listText);
    } else {
        await client.sendList(
            chatId,
            '📋 *Menu Selection*\n\nChoose from our menu:',
            'View Menu',
            sections
        );
    }
}

async function handleAdminCommand(chatId, args) {
    if (args.length === 0) {
        await sendMessage(chatId, '🔧 *Admin Commands*\n\n!admin status - Bot status\n!admin restart - Restart bot');
        return;
    }
    
    const adminCmd = args[0].toLowerCase();
    
    switch (adminCmd) {
        case 'status':
            const stats = {
                uptime: Math.floor(process.uptime()),
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                mode: DEMO_MODE ? 'Demo' : 'Live'
            };
            
            await sendMessage(chatId, `📊 *Bot Status*\n\nUptime: ${stats.uptime}s\nMemory: ${stats.memory}MB\nMode: ${stats.mode}`);
            break;
            
        case 'restart':
            await sendMessage(chatId, '🔄 Restarting bot...');
            process.exit(0);
            break;
            
        case 'demo':
            if (args[1] === 'off') {
                console.log('🔧 Switching to live mode (requires proper WhatsApp implementation)');
                await sendMessage(chatId, '⚠️ Switching to live mode - this requires proper WhatsApp Web protocol implementation');
            }
            break;
            
        default:
            await sendMessage(chatId, '❓ Unknown admin command.');
    }
}

/**
 * Connect the bot (only in live mode)
 */
async function connectBot() {
    if (DEMO_MODE) {
        console.log('🎭 Demo mode active - skipping real connection');
        return;
    }
    
    try {
        console.log('🚀 Starting ChatPulse WhatsApp Bot...');
        console.log('⚠️  Warning: Expecting connection errors due to incomplete protocol implementation');
        await client.connect();
    } catch (error) {
        console.error('❌ Failed to connect:', error.message);
        
        // Check if it's a protocol-related error
        if (error.message?.includes('Text Frames') || error.code === 'INVALID_MESSAGE') {
            console.log('');
            console.log('🔍 This error is expected with the current ChatPulse framework');
            console.log('💡 The library needs complete WhatsApp Web protocol implementation');
            console.log('🎭 Switch to DEMO_MODE = true to see bot functionality');
            console.log('');
            return; // Don't retry for protocol errors
        }
        
        console.log('🔄 Retrying in 10 seconds...');
        setTimeout(connectBot, 10000);
    }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bot...');
    try {
        if (!DEMO_MODE) {
            await client.disconnect();
        }
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
if (DEMO_MODE) {
    console.log('🎭 Starting in demo mode...');
    console.log('💡 To test commands, the bot will simulate receiving "!help"');
    console.log('🔧 Set DEMO_MODE = false for real WhatsApp connection (requires proper implementation)');
} else {
    connectBot();
}