const { sendVerificationEmail } = require('./emailService');
require('dotenv').config({ path: '../.env' });

async function testConnection() {
    console.log('🚀 Iniciando teste de e-mail real...');
    console.log(`📡 Host: ${process.env.EMAIL_HOST}`);
    console.log(`📧 User: ${process.env.EMAIL_USER}`);

    // Test email destination (same as sender for validation)
    const testDest = process.env.EMAIL_USER;

    const result = await sendVerificationEmail(testDest, 'Testador Admin', 'token-de-teste-123');

    if (result.success) {
        console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
        console.log('Verifique sua caixa de entrada (ou lixeira/spam).');
    } else {
        console.log('\n❌ FALHA NO TESTE:');
        console.error(result.error);
        console.log('\nDICA: Verifique se sua "Senha de App" do Google está correta e se a Verificação em Duas Etapas está ativa.');
    }
}

testConnection();
