/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { logger } from '../utils/Logger.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { CryptoUtil } from '../utils/CryptoUtil.js';

export class PollHandler {
    constructor(whatsappClient) {
        this.client = whatsappClient;
        this.activePoll = new Map();
    }
    
    /**
     * Create poll
     */
    async createPoll(to, question, options, settings = {}) {
        try {
            errorHandler.validateRequired({ to, question, options }, 
                ['to', 'question', 'options'], 'create poll');
            
            if (!Array.isArray(options) || options.length < 2) {
                throw new Error('Poll must have at least 2 options');
            }
            
            if (options.length > 12) {
                throw new Error('Poll can have maximum 12 options');
            }
            
            const pollId = CryptoUtil.generateMessageId();
            const chatId = this.formatJid(to);
            
            const pollData = {
                pollId,
                chatId,
                question,
                options: options.map((option, index) => ({
                    id: index,
                    text: option,
                    votes: 0
                })),
                settings: {
                    multipleChoice: settings.multipleChoice || false,
                    anonymous: settings.anonymous !== false,
                    ...settings
                },
                createdAt: Date.now(),
                votes: new Map()
            };
            
            // Store poll data
            this.activePoll.set(pollId, pollData);
            
            const messagePacket = this.client.packetBuilder.buildPollPacket(
                chatId,
                question,
                options,
                settings
            );
            
            await this.client.wsManager.send(messagePacket);
            
            logger.info(`📊 Created poll: ${question} with ${options.length} options`);
            
            return {
                pollId,
                chatId,
                question,
                options: pollData.options,
                settings: pollData.settings,
                success: true
            };
            
        } catch (error) {
            throw errorHandler.createError(error, 'create poll');
        }
    }
    
    /**
     * Vote on poll
     */
    async votePoll(pollId, optionIds, voterId) {
        try {
            const poll = this.activePoll.get(pollId);
            
            if (!poll) {
                throw new Error('Poll not found');
            }
            
            if (!Array.isArray(optionIds)) {
                optionIds = [optionIds];
            }
            
            // Check if multiple choice is allowed
            if (optionIds.length > 1 && !poll.settings.multipleChoice) {
                throw new Error('Multiple choice not allowed for this poll');
            }
            
            // Validate option IDs
            const validOptionIds = optionIds.filter(id => 
                poll.options.some(option => option.id === id)
            );
            
            if (validOptionIds.length === 0) {
                throw new Error('No valid option IDs provided');
            }
            
            // Remove previous votes from this voter
            if (poll.votes.has(voterId)) {
                const previousVotes = poll.votes.get(voterId);
                previousVotes.forEach(optionId => {
                    const option = poll.options.find(opt => opt.id === optionId);
                    if (option) option.votes--;
                });
            }
            
            // Add new votes
            validOptionIds.forEach(optionId => {
                const option = poll.options.find(opt => opt.id === optionId);
                if (option) option.votes++;
            });
            
            // Store voter's choices
            poll.votes.set(voterId, validOptionIds);
            
            // Send vote packet
            const votePacket = this.client.packetBuilder.buildPollVotePacket(
                pollId,
                validOptionIds,
                voterId
            );
            
            await this.client.wsManager.send(votePacket);
            
            logger.info(`🗳️ Vote cast on poll ${pollId} by ${voterId}`);
            
            return {
                pollId,
                votedOptions: validOptionIds,
                pollResults: this.getPollResults(pollId),
                success: true
            };
            
        } catch (error) {
            throw errorHandler.createError(error, 'vote poll');
        }
    }
    
    /**
     * Get poll results
     */
    getPollResults(pollId) {
        const poll = this.activePoll.get(pollId);
        
        if (!poll) {
            return null;
        }
        
        const totalVotes = Array.from(poll.votes.values()).length;
        
        return {
            pollId,
            question: poll.question,
            totalVotes,
            options: poll.options.map(option => ({
                id: option.id,
                text: option.text,
                votes: option.votes,
                percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
            })),
            settings: poll.settings,
            createdAt: poll.createdAt
        };
    }
    
    /**
     * Close poll
     */
    async closePoll(pollId) {
        try {
            const poll = this.activePoll.get(pollId);
            
            if (!poll) {
                throw new Error('Poll not found');
            }
            
            // Send close poll packet
            const closePacket = this.client.packetBuilder.buildClosePollPacket(pollId);
            await this.client.wsManager.send(closePacket);
            
            // Get final results
            const results = this.getPollResults(pollId);
            
            // Remove from active polls
            this.activePoll.delete(pollId);
            
            logger.info(`📊 Closed poll: ${pollId}`);
            
            return {
                pollId,
                results,
                success: true
            };
            
        } catch (error) {
            throw errorHandler.createError(error, 'close poll');
        }
    }
    
    /**
     * Format JID (WhatsApp ID)
     */
    formatJid(jid) {
        if (!jid) return null;
        
        // Remove any existing suffix
        jid = jid.split('@')[0];
        
        // Add appropriate suffix
        if (jid.includes('-')) {
            // Group chat
            return `${jid}@g.us`;
        } else {
            // Individual chat
            return `${jid}@s.whatsapp.net`;
        }
    }
    
    /**
     * Get poll handler statistics
     */
    getStats() {
        return {
            activePolls: this.activePoll.size,
            polls: Array.from(this.activePoll.values()).map(poll => ({
                pollId: poll.pollId,
                question: poll.question,
                totalVotes: poll.votes.size,
                createdAt: poll.createdAt
            }))
        };
    }
}