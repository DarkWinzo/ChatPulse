/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Test Suite for MessageHandler
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageHandler } from '../src/handlers/MessageHandler.js';
import { WhatsApp } from '../src/sdk/WhatsApp.js';

describe('MessageHandler', () => {
    let messageHandler;
    let mockClient;
    
    beforeEach(() => {
        // Create mock WhatsApp client
        mockClient = {
            wsManager: {
                isReady: vi.fn(() => true),
                send: vi.fn(() => Promise.resolve())
            },
            packetBuilder: {
                buildMessagePacket: vi.fn(() => '{"type":"message"}'),
                buildDeleteMessagePacket: vi.fn(() => '{"type":"delete"}'),
                buildEditMessagePacket: vi.fn(() => '{"type":"edit"}')
            },
            updatePresence: vi.fn(() => Promise.resolve())
        };
        
        messageHandler = new MessageHandler(mockClient);
    });
    
    describe('sendText', () => {
        it('should send text message successfully', async () => {
            const result = await messageHandler.sendText('1234567890', 'Hello World');
            
            expect(result).toHaveProperty('messageId');
            expect(result).toHaveProperty('success', true);
            expect(result.to).toBe('1234567890@s.whatsapp.net');
            expect(mockClient.wsManager.send).toHaveBeenCalled();
        });
        
        it('should throw error for missing parameters', async () => {
            await expect(messageHandler.sendText('', 'Hello')).rejects.toThrow();
            await expect(messageHandler.sendText('1234567890', '')).rejects.toThrow();
        });
        
        it('should format JID correctly for individual chat', async () => {
            await messageHandler.sendText('1234567890', 'Hello');
            
            const packet = mockClient.packetBuilder.buildMessagePacket.mock.calls[0];
            expect(packet[0]).toBe('1234567890@s.whatsapp.net');
        });
        
        it('should format JID correctly for group chat', async () => {
            await messageHandler.sendText('1234567890-1234567890', 'Hello Group');
            
            const packet = mockClient.packetBuilder.buildMessagePacket.mock.calls[0];
            expect(packet[0]).toBe('1234567890-1234567890@g.us');
        });
    });
    
    describe('sendReply', () => {
        it('should send reply with quoted message', async () => {
            const quotedMessage = { messageId: 'msg123', content: 'Original message' };
            const result = await messageHandler.sendReply('1234567890', 'Reply text', quotedMessage);
            
            expect(result).toHaveProperty('success', true);
            expect(mockClient.wsManager.send).toHaveBeenCalled();
        });
    });
    
    describe('forwardMessage', () => {
        it('should forward message successfully', async () => {
            const originalMessage = {
                content: 'Original content',
                messageType: 'conversation',
                from: '0987654321@s.whatsapp.net'
            };
            
            const result = await messageHandler.forwardMessage('1234567890', originalMessage);
            
            expect(result).toHaveProperty('success', true);
            expect(mockClient.wsManager.send).toHaveBeenCalled();
        });
    });
    
    describe('sendTyping', () => {
        it('should send typing indicator', async () => {
            await messageHandler.sendTyping('1234567890', true);
            
            expect(mockClient.updatePresence).toHaveBeenCalledWith(
                '1234567890@s.whatsapp.net',
                'composing'
            );
        });
        
        it('should send stop typing indicator', async () => {
            await messageHandler.sendTyping('1234567890', false);
            
            expect(mockClient.updatePresence).toHaveBeenCalledWith(
                '1234567890@s.whatsapp.net',
                'paused'
            );
        });
    });
    
    describe('deleteMessage', () => {
        it('should delete message for self', async () => {
            const result = await messageHandler.deleteMessage('msg123', '1234567890@s.whatsapp.net', false);
            
            expect(result).toEqual({
                success: true,
                messageId: 'msg123',
                deletedForEveryone: false
            });
            expect(mockClient.wsManager.send).toHaveBeenCalled();
        });
        
        it('should delete message for everyone', async () => {
            const result = await messageHandler.deleteMessage('msg123', '1234567890@s.whatsapp.net', true);
            
            expect(result.deletedForEveryone).toBe(true);
        });
    });
    
    describe('editMessage', () => {
        it('should edit message successfully', async () => {
            const result = await messageHandler.editMessage('msg123', '1234567890@s.whatsapp.net', 'Edited text');
            
            expect(result).toEqual({
                success: true,
                messageId: 'msg123',
                newText: 'Edited text'
            });
            expect(mockClient.wsManager.send).toHaveBeenCalled();
        });
        
        it('should throw error for missing parameters', async () => {
            await expect(messageHandler.editMessage('', 'chat', 'text')).rejects.toThrow();
            await expect(messageHandler.editMessage('msg', '', 'text')).rejects.toThrow();
            await expect(messageHandler.editMessage('msg', 'chat', '')).rejects.toThrow();
        });
    });
    
    describe('sendLocation', () => {
        it('should send location message', async () => {
            const result = await messageHandler.sendLocation(
                '1234567890',
                37.7749,
                -122.4194,
                'San Francisco',
                'San Francisco, CA, USA'
            );
            
            expect(result).toHaveProperty('success', true);
            expect(mockClient.wsManager.send).toHaveBeenCalled();
        });
        
        it('should throw error for missing coordinates', async () => {
            await expect(messageHandler.sendLocation('1234567890', null, -122.4194)).rejects.toThrow();
            await expect(messageHandler.sendLocation('1234567890', 37.7749, null)).rejects.toThrow();
        });
    });
    
    describe('sendContact', () => {
        it('should send contact message', async () => {
            const contact = {
                name: 'John Doe',
                phone: '+1234567890',
                email: 'john@example.com'
            };
            
            const result = await messageHandler.sendContact('1234567890', contact);
            
            expect(result).toHaveProperty('success', true);
            expect(mockClient.wsManager.send).toHaveBeenCalled();
        });
        
        it('should generate VCard correctly', () => {
            const contact = {
                name: 'John Doe',
                phone: '+1234567890',
                email: 'john@example.com',
                organization: 'Example Corp'
            };
            
            const vcard = messageHandler.generateVCard(contact);
            
            expect(vcard).toContain('BEGIN:VCARD');
            expect(vcard).toContain('FN:John Doe');
            expect(vcard).toContain('TEL;TYPE=CELL:+1234567890');
            expect(vcard).toContain('EMAIL:john@example.com');
            expect(vcard).toContain('ORG:Example Corp');
            expect(vcard).toContain('END:VCARD');
        });
    });
    
    describe('formatJid', () => {
        it('should format individual JID correctly', () => {
            expect(messageHandler.formatJid('1234567890')).toBe('1234567890@s.whatsapp.net');
            expect(messageHandler.formatJid('1234567890@s.whatsapp.net')).toBe('1234567890@s.whatsapp.net');
        });
        
        it('should format group JID correctly', () => {
            expect(messageHandler.formatJid('1234567890-1234567890')).toBe('1234567890-1234567890@g.us');
            expect(messageHandler.formatJid('1234567890-1234567890@g.us')).toBe('1234567890-1234567890@g.us');
        });
        
        it('should handle null/undefined JID', () => {
            expect(messageHandler.formatJid(null)).toBe(null);
            expect(messageHandler.formatJid(undefined)).toBe(null);
        });
    });
    
    describe('isGroup', () => {
        it('should identify group JIDs correctly', () => {
            expect(messageHandler.isGroup('1234567890-1234567890@g.us')).toBe(true);
            expect(messageHandler.isGroup('1234567890@s.whatsapp.net')).toBe(false);
            expect(messageHandler.isGroup(null)).toBe(false);
        });
    });
    
    describe('rate limiting', () => {
        it('should track message count', async () => {
            // Send multiple messages
            for (let i = 0; i < 5; i++) {
                await messageHandler.sendText('1234567890', `Message ${i}`);
            }
            
            const stats = messageHandler.getStats();
            expect(stats.rateLimit.messages).toBe(5);
        });
        
        it('should throw error when rate limit exceeded', async () => {
            // Manually set rate limit to maximum
            messageHandler.rateLimit.messages = 20;
            
            await expect(messageHandler.sendText('1234567890', 'Test')).rejects.toThrow();
        });
    });
    
    describe('message queue', () => {
        it('should queue messages when not connected', async () => {
            mockClient.wsManager.isReady.mockReturnValue(false);
            
            const result = await messageHandler.sendText('1234567890', 'Queued message');
            
            expect(result.queued).toBe(true);
            expect(messageHandler.getStats().queuedMessages).toBe(1);
        });
        
        it('should process queued messages when connected', async () => {
            // Queue a message
            mockClient.wsManager.isReady.mockReturnValue(false);
            await messageHandler.sendText('1234567890', 'Queued message');
            
            // Simulate connection
            mockClient.wsManager.isReady.mockReturnValue(true);
            await messageHandler.processQueue();
            
            expect(mockClient.wsManager.send).toHaveBeenCalled();
            expect(messageHandler.getStats().queuedMessages).toBe(0);
        });
    });
});