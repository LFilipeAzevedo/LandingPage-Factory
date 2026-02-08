const { Resend } = require('resend');
require('dotenv').config();

// Inicializa o cliente Resend apenas se a chave estiver configurada
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const sendVerificationEmail = async (email, username, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/verify-email/${token}`;

    // Verificação de segurança: Modos de desenvolvimento ou falta de chave
    if (!resend) {
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ ERRO CRÍTICO: RESEND_API_KEY não configurada em PRODUÇÃO!');
            return { success: false, error: 'Configuração de e-mail (Resend) ausente.' };
        }
        // Fallback elegante para desenvolvimento sem chave
        console.log('\n========================================');
        console.log('📧 E-MAIL DE VERIFICAÇÃO (Simulado - Sem Chave Resend)');
        console.log('========================================');
        console.log(`Para: ${email}`);
        console.log(`Usuário: ${username}`);
        console.log(`Link: ${url}`);
        console.log('========================================\n');
        return { success: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Landing Page Factory <onboarding@resend.dev>', // Domínio de teste padrão do Resend
            to: [email], // Em teste (grátis), só envia para o email cadastrado na conta Resend
            subject: 'Confirme sua conta - Landing Page Factory',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #106a94ff;">Bem-vindo, ${username}!</h2>
                    <p>Obrigado por se cadastrar. Confirme seu e-mail clicando abaixo:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${url}" style="background-color: #109426ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            CONFIRMAR CONTA
                        </a>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('Erro Resend:', error);
            return { success: false, error };
        }

        console.log(`Email de verificação enviado via Resend ID: ${data.id}`);
        return { success: true };
    } catch (err) {
        console.error('Exceção no envio Resend:', err);
        return { success: false, error: err };
    }
};

const sendPasswordResetEmail = async (email, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/reset-password/${token}`;

    if (!resend) {
        if (process.env.NODE_ENV === 'production') {
            return { success: false, error: 'RESEND_API_KEY ausente.' };
        }
        console.log(`[DEV] Reset de senha simulado para ${email}: ${url}`);
        return { success: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Landing Page Factory <onboarding@resend.dev>',
            to: [email],
            subject: 'Redefinição de Senha',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #fa4eab;">Redefinição de Senha</h2>
                    <p>Clique abaixo para redefinir:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${url}" style="background-color: #fa4eab; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            REDEFINIR SENHA
                        </a>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('Erro Resend (Reset):', error);
            return { success: false, error };
        }

        console.log(`Email de reset enviado via Resend ID: ${data.id}`);
        return { success: true };
    } catch (err) {
        console.error('Exceção Resend (Reset):', err);
        return { success: false, error: err };
    }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
