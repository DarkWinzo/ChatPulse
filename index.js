/**
 * ChatPulse - Advanced WhatsApp Web API Library
 * Developer: DarkWinzo (https://github.com/DarkWinzo)
 * Email: isurulakshan9998@gmail.com
 * Organization: DarkSide Developer Team
 * © 2025 DarkSide Developers Team. All rights reserved.
 */

import { WhatsApp } from './src/sdk/WhatsApp.js';

// Export the main WhatsApp class and utilities
export { WhatsApp };
export { Logger } from './src/utils/Logger.js';
export { ErrorHandler } from './src/utils/ErrorHandler.js';

// Default export for CommonJS compatibility
export default WhatsApp;

// Example usage demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🚀 ChatPulse WhatsApp Web API Library');
    console.log('📖 Usage: import { WhatsApp } from "chatpulse"');
    console.log('🔗 Repository: https://github.com/DarkSide-Developers/ChatPulse');
    console.log('👨‍💻 Developer: DarkWinzo');
    console.log('🏢 Organization: DarkSide Developer Team');
}