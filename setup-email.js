// Email Setup Script for WorkSync Newsletter
// This will help you configure Gmail to send real emails

import fs from 'fs';
import path from 'path';

console.log('🚀 WorkSync Email Setup');
console.log('========================');
console.log('');

console.log('📧 Setting up Gmail for newsletter emails...');
console.log('');

// Create .env file content
const envContent = `# Gmail Configuration for WorkSync Newsletter
# Replace these with your actual Gmail credentials

# Your Gmail address
EMAIL_USER=your-email@gmail.com

# Your Gmail App Password (16 characters)
# Get this from: https://myaccount.google.com/security
EMAIL_PASS=your-app-password

# Email sender information
EMAIL_FROM=WorkSync <noreply@worksync.ng>

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=worksync

# Server Configuration
NODE_ENV=development
PORT=5000
JWT_SECRET=your-jwt-secret
`;

// Write .env file
const envPath = path.join(process.cwd(), 'server', '.env');
fs.writeFileSync(envPath, envContent);

console.log('✅ Created .env file at: server/.env');
console.log('');

console.log('🔧 NEXT STEPS:');
console.log('==============');
console.log('');
console.log('1. 📧 Get Gmail App Password:');
console.log('   - Go to: https://myaccount.google.com/security');
console.log('   - Enable 2-Factor Authentication');
console.log('   - Generate App Password for "Mail"');
console.log('   - Copy the 16-character password');
console.log('');

console.log('2. ✏️  Edit server/.env file:');
console.log('   - Replace "your-email@gmail.com" with your Gmail');
console.log('   - Replace "your-app-password" with your 16-char password');
console.log('');

console.log('3. 🔄 Restart your server:');
console.log('   - Stop the current server (Ctrl+C)');
console.log('   - Run: cd server && npm start');
console.log('');

console.log('4. 🧪 Test email delivery:');
console.log('   - Go to: http://localhost:3100');
console.log('   - Scroll to "Stay in the Loop"');
console.log('   - Enter: iazeez775@gmail.com');
console.log('   - Click Subscribe');
console.log('   - Check email inbox!');
console.log('');

console.log('📧 What iazeez775@gmail.com will receive:');
console.log('- Professional welcome email');
console.log('- WorkSync branding');
console.log('- Nigerian contact information');
console.log('- Unsubscribe options');
console.log('');

console.log('🎉 Once configured, emails will be sent automatically!');
console.log('');
console.log('💡 Need help? Check GMAIL_SETUP_GUIDE.md for detailed instructions.');
