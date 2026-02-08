const { sendVerificationEmail } = require('./utils/emailService');
require('dotenv').config();

async function test() {
    console.log('🚀 Iniciando teste de e-mail...');
    const result = await sendVerificationEmail('LPFactory.Dev@gmail.com', 'Teste Debug Gmail', 'token-debug-123');
    console.log('Result:', JSON.stringify(result, null, 2));
}

test();
