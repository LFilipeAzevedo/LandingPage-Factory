const nodemailer = require('nodemailer');
const dns = require('dns');
const util = require('util');
require('dotenv').config();

const resolve4 = util.promisify(dns.resolve4);

// Cache do IP para evitar lookup em todo envio (opcional, mas bom pra performance)
let cachedIp = null;

const getTransporter = async () => {
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.PORTA_DE_EMAIL || process.env.EMAIL_PORT || 587);
    const isSecure = (process.env.EMAIL_SEGURO === 'verdadeiro' || process.env.EMAIL_SECURE === 'true') && emailPort === 465;

    let hostToUse = emailHost;

    // Tenta resolver IPv4 manualmente para o Gmail
    if (emailHost === 'smtp.gmail.com') {
        try {
            if (!cachedIp) {
                const addresses = await resolve4(emailHost);
                if (addresses && addresses.length > 0) {
                    cachedIp = addresses[0];
                    console.log(`[EmailService] DNS Resolvido: ${emailHost} -> ${cachedIp} (Forçando IPv4)`);
                }
            }
            if (cachedIp) {
                hostToUse = cachedIp;
            }
        } catch (err) {
            console.error('[EmailService] Falha ao resolver DNS IPv4, usando hostname original:', err.message);
        }
    }

    return nodemailer.createTransport({
        host: hostToUse,
        port: emailPort,
        secure: isSecure,
        auth: {
            user: process.env.USUÁRIO_DE_EMAIL || process.env.EMAIL_USER,
            pass: process.env.SENHA_DE_EMAIL || process.env.EMAIL_PASS
        },
        tls: {
            // Importante: Quando usamos IP no host, precisamos dizer qual é o servidor real para o SNI
            servername: emailHost,
            rejectUnauthorized: false
        },
        // Configurações de socket
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
        debug: true, // Mantemos logs detalhados para debug no Railway
        logger: true
    });
};

const sendVerificationEmail = async (email, username, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/verify-email/${token}`;

    const userEmail = process.env.USUÁRIO_DE_EMAIL || process.env.EMAIL_USER;
    const passEmail = process.env.SENHA_DE_EMAIL || process.env.EMAIL_PASS;

    // Development mode fallback
    if (!userEmail || !passEmail) {
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ ERRO CRÍTICO: EMAIL_USER ou EMAIL_PASS não configurado em PRODUÇÃO!');
            return { success: false, error: 'Configuração de e-mail ausente no servidor.' };
        }
        console.log('\n========================================');
        console.log('📧 E-MAIL DE VERIFICAÇÃO (Modo Dev)');
        console.log('========================================');
        console.log(`Para: ${email}`);
        console.log(`Usuário: ${username}`);
        console.log(`Link de verificação: ${url}`);
        console.log('========================================\n');
        return { success: true };
    }

    const defaultFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Landing Page Builder" <noreply@seu-dominio.com>';

    const mailOptions = {
        from: process.env['E-MAIL_DE'] || defaultFrom,
        to: email,
        subject: 'Confirme sua conta - Landing Page Builder',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #106a94ff;">Bem-vindo, ${username}!</h2>
                <p>Obrigado por se cadastrar em nossa plataforma. Para começar a criar suas landing pages, confirme seu e-mail clicando no botão abaixo:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="background-color: #109426ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        CONFIRMAR MINHA CONTA
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666;">Se você não criou esta conta, por favor ignore este e-mail.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 0.7rem; color: #999; text-align: center;">© 2026 LP Factory</p>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`Email de verificação enviado para ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return { success: false, error };
    }
};

const sendPasswordResetEmail = async (email, token) => {
    const frontendUrl = (process.env.URL_FRONTEND || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = `${frontendUrl}/admin/reset-password/${token}`;

    const defaultFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Landing Page Builder" <noreply@seu-dominio.com>';

    const mailOptions = {
        from: process.env['E-MAIL_DE'] || defaultFrom,
        to: email,
        subject: 'Redefinição de Senha - Landing Page Builder',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #fa4eab;">Redefinição de Senha</h2>
                <p>Você solicitou a redefinição de senha para sua conta. Clique no botão abaixo para criar uma nova senha:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${url}" style="background-color: #fa4eab; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        REDEFINIR MINHA SENHA
                    </a>
                </div>
                <p style="font-size: 0.8rem; color: #666;">Se você não solicitou isso, por favor ignore este e-mail. O link expira em 1 hora.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 0.7rem; color: #999; text-align: center;">© 2026 Landing Page Factory</p>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`Email de redefinição enviado para ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Erro ao enviar e-mail de redefinição:', error);
        return { success: false, error };
    }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
