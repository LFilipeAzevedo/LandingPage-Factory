require('dotenv').config();

const sendBrevoEmail = async (toEmail, subject, htmlContent) => {
    const apiKey = process.env.BREVO_API_KEY;

    // Fallback para desenvolvimento sem chave
    if (!apiKey) {
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ ERRO CRÍTICO: BREVO_API_KEY não configurada em PRODUÇÃO!');
            return { success: false, error: 'Chave de API do Brevo ausente.' };
        }
        console.log('\n========================================');
        console.log('📧 E-MAIL SIMULADO (Sem Chave Brevo)');
        console.log(`Para: ${toEmail}`);
        console.log(`Assunto: ${subject}`);
        console.log('========================================\n');
        return { success: true };
    }

    const senderEmail = process.env.EMAIL_USER || 'LPFactory.Dev@gmail.com';
    const senderName = 'Landing Page Factory';

    const url = 'https://api.brevo.com/v3/smtp/email';
    const options = {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: {
                name: senderName,
                email: senderEmail
            },
            to: [
                {
                    email: toEmail
                }
            ],
            subject: subject,
            htmlContent: htmlContent
        })
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            console.error('Erro Brevo API:', data);
            return { success: false, error: data };
        }

        console.log(`Email enviado via Brevo ID: ${data.messageId}`);
        return { success: true };
    } catch (err) {
        console.error('Exceção no envio Brevo:', err);
        return { success: false, error: err };
    }
};

const sendVerificationEmail = async (email, username, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/verify-email/${token}`;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #106a94ff;">Bem-vindo, ${username}!</h2>
            <p>Obrigado por se cadastrar. Confirme seu e-mail clicando abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${url}" style="background-color: #109426ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    CONFIRMAR CONTA
                </a>
            </div>
            <p style="font-size: 0.8rem; color: #666;">Se você não criou esta conta, ignore este e-mail.</p>
        </div>
    `;

    return await sendBrevoEmail(email, 'Confirme sua conta - Landing Page Factory', html);
};

const sendPasswordResetEmail = async (email, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/reset-password/${token}`;

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #fa4eab;">Redefinição de Senha</h2>
            <p>Clique abaixo para redefinir sua senha:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${url}" style="background-color: #fa4eab; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    REDEFINIR SENHA
                </a>
            </div>
            <p style="font-size: 0.8rem; color: #666;">Link válido por 1 hora.</p>
        </div>
    `;

    return await sendBrevoEmail(email, 'Redefinição de Senha', html);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
