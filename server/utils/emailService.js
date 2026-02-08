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

const getEmailTemplate = (title, bodyContent, actionUrl, actionText) => {
    const currentYear = new Date().getFullYear();

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155;">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
            <tr>
                <td align="center">
                    
                    <!-- Content Card -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; margin: 0 auto; max-width: 90%;">
                        
                        <!-- Header / Logo -->
                        <tr>
                            <td style="background-color: #1e293b; padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Landing Page Factory</h1>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin-top: 0; margin-bottom: 20px; color: #0f172a; font-size: 20px; font-weight: 600;">${title}</h2>
                                
                                <div style="font-size: 16px; line-height: 1.6; color: #475569;">
                                    ${bodyContent}
                                </div>

                                <!-- Action Button -->
                                ${actionUrl ? `
                                <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
                                    <a href="${actionUrl}" style="background-color: #2563eb; color: #ffffff; display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                                        ${actionText}
                                    </a>
                                </div>
                                <p style="margin-top: 30px; font-size: 13px; color: #94a3b8; text-align: center;">
                                    Ou cole este link no navegador: <br>
                                    <a href="${actionUrl}" style="color: #2563eb; word-break: break-all;">${actionUrl}</a>
                                </p>
                                ` : ''}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-size: 13px; color: #64748b;">
                                    &copy; ${currentYear} Landing Page Factory. Todos os direitos reservados.
                                </p>
                                <p style="margin: 10px 0 0; font-size: 12px; color: #94a3b8;">
                                    Você recebeu este e-mail porque se cadastrou ou solicitou uma ação em nossa plataforma.
                                </p>
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>
    
    </body>
    </html>
    `;
};

const sendVerificationEmail = async (email, username, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/verify-email/${token}`;

    const body = `
        <p>Olá, <strong>${username}</strong>!</p>
        <p>Seja muito bem-vindo. Estamos empolgados em ter você conosco.</p>
        <p>Para garantir a segurança da sua conta e liberar todos os recursos, por favor, clique no botão abaixo para confirmar seu endereço de e-mail.</p>
    `;

    const html = getEmailTemplate('Confirme seu E-mail', body, url, 'Confirmar Minha Conta');
    return await sendBrevoEmail(email, 'Bem-vindo ao Landing Page Factory', html);
};

const sendPasswordResetEmail = async (email, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/reset-password/${token}`;

    const body = `
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Se foi você quem solicitou, clique no botão abaixo para criar uma nova senha segura.</p>
        <p style="padding: 12px; background-color: #fff1f2; border-left: 4px solid #f43f5e; color: #be123c; margin-top: 20px; font-size: 14px;">
            <strong>Importante:</strong> Este link expira em 1 hora por motivos de segurança.
        </p>
    `;

    const html = getEmailTemplate('Redefinição de Senha', body, url, 'Redefinir Minha Senha');
    return await sendBrevoEmail(email, 'Instruções de Segurança', html);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
