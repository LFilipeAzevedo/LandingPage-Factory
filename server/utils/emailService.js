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

    // Força minúsculo para bater com o cadastro no Brevo (Case Sensitive Strict)
    const senderEmail = (process.env.EMAIL_USER || 'lpfactory.dev@gmail.com').toLowerCase();
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
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            <div style="text-align: center; padding: 20px 0;">
                <h2 style="color: #1e293b; margin-bottom: 10px;">Bem-vindo ao Landing Page Factory!</h2>
                <p style="font-size: 16px; line-height: 1.5;">Olá, <strong>${username}</strong>. Estamos felizes em tê-lo conosco.</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin-bottom: 25px; font-size: 15px;">Para garantir a segurança da sua conta e acessar todos os recursos, por favor, confirme seu endereço de e-mail.</p>
                <a href="${url}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px;">
                    Confirmar Meu E-mail
                </a>
                <p style="margin-top: 25px; font-size: 13px; color: #64748b;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br><a href="${url}" style="color: #2563eb;">${url}</a></p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
                <p>Se você não criou esta conta, nenhuma ação é necessária.</p>
            </div>
        </div>
    `;

    return await sendBrevoEmail(email, 'Confirme sua conta - Landing Page Factory', html);
};

const sendPasswordResetEmail = async (email, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/reset-password/${token}`;

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
            <div style="text-align: center; padding: 20px 0;">
                <h2 style="color: #1e293b; margin-bottom: 10px;">Redefinição de Senha</h2>
                <p style="font-size: 16px;">Recebemos uma solicitação para alterar sua senha.</p>
            </div>

            <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="margin-bottom: 25px; font-size: 15px;">Clique no botão abaixo para criar uma nova senha segura:</p>
                <a href="${url}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px;">
                    Redefinir Minha Senha
                </a>
                <p style="margin-top: 25px; font-size: 13px; color: #64748b;">Este link é válido por 1 hora.</p>
            </div>

            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
                <p>Se você não solicitou esta alteração, ignore este e-mail. Sua senha permanecerá a mesma.</p>
            </div>
        </div>
    `;

    return await sendBrevoEmail(email, 'Instruções para Redefinição de Senha', html);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
