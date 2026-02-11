const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';

router.post('/login', (req, res) => {
    let { username, password } = req.body;

    // Sanitization
    if (username) username = username.trim();

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get("SELECT * FROM users WHERE username = ? OR email = ?", [username, username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // BLOCK login if NOT verified
        if (user.is_verified === 0) {
            return res.status(403).json({
                error: 'Account not verified. Please check your email.',
                requiresVerification: true
            });
        }

        // BLOCK login if DEACTIVATED
        if (user.is_active === 0) {
            return res.status(403).json({
                error: 'Sua conta foi desativada. Entre em contato com o suporte para mais informações.'
            });
        }

        const passwordIsValid = bcrypt.compareSync(password, user.password_hash);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid credentials' });

        // AUTOMATIC DOWNGRADE: Check if yearly plan has expired
        if (user.plan_tier !== 'static' && user.plan_tier !== 'adm_server' && user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date()) {
            db.run("UPDATE users SET plan_tier = 'static', subscription_status = 'expired' WHERE id = ?", [user.id], (err) => {
                if (err) console.error('Error during auto-downgrade:', err);
            });
            user.plan_tier = 'static';
        }

        const token = jwt.sign({ id: user.id, username: user.username, plan_tier: user.plan_tier }, SECRET_KEY, {
            expiresIn: 86400 // 24 hours
        });

        res.json({
            auth: true,
            token: token,
            user: {
                username: user.username,
                plan_tier: user.plan_tier
            }
        });
    });
});

router.post('/register', (req, res) => {
    let { username, password, email } = req.body;

    // Sanitization
    if (username) username = username.trim();
    if (email) email = email.trim();



    if (!username || !password || !email) {

        return res.status(400).json({ error: 'Username, password and email are required' });
    }

    // Check if user or email already exists
    db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], (err, existingUser) => {
        if (err) {
            console.error('❌ Erro ao verificar usuário:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingUser) {

            return res.status(400).json({ error: 'Username or email already taken' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const planTier = 'static'; // Default tier for new signups
        const verificationToken = crypto.randomBytes(32).toString('hex');

        db.run("INSERT INTO users (username, email, password_hash, plan_tier, verification_token) VALUES (?, ?, ?, ?, ?)",
            [username, email, passwordHash, planTier, verificationToken], function (err) {
                if (err) {
                    console.error('❌ Erro ao criar usuário:', err.message);
                    return res.status(500).json({ error: 'Error creating user: ' + err.message });
                }


                const userId = this.lastID;
                const defaultSlug = username.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

                const defaultContent = JSON.stringify({
                    heroTitle: "Bem-vindo ao seu novo site!",
                    heroSubtitle: "Clique no botão abaixo para começar a editar este conteúdo e criar algo incrível.",
                    ctaText: "Começar Agora",
                    features: [
                        { title: "Fácil de Usar", description: "Editor intuitivo para você focar no que importa." },
                        { title: "Responsivo", description: "Seu site fica lindo em qualquer dispositivo." }
                    ],
                    footerText: `© ${new Date().getFullYear()} ${username}. Todos os direitos reservados.`,
                    topBar: { enabled: false, text: '', backgroundColor: '#fa4eab', textColor: '#ffffff' }
                });

                db.run("INSERT INTO pages (user_id, slug, content) VALUES (?, ?, ?)", [userId, defaultSlug, defaultContent], async (err) => {
                    if (err) {
                        console.error('❌ Erro ao criar página:', err.message);
                        return res.status(500).json({ error: 'Error creating initial page: ' + err.message });
                    }


                    // Send Verification Email (Asynchronous)
                    sendVerificationEmail(email, username, verificationToken).then(emailResult => {
                        if (emailResult.success) {
                            console.log(`📬 E-mail de verificação enviado para ${email}`);
                        } else {
                            console.error('❌ Erro no e-mail de background:', emailResult.error);
                        }
                    }).catch(err => {
                        console.error('🔥 Erro fatal no envio de e-mail:', err);
                    });



                    res.status(201).json({
                        success: true,
                        message: 'Conta criada com sucesso! Verifique seu e-mail para ativar sua conta antes de fazer login.',
                        emailSent: true // Assumimos que foi para a fila de envio
                    });
                });
            });
    });
});

router.get('/verify-email/:token', (req, res) => {
    const { token } = req.params;

    db.get("SELECT id FROM users WHERE verification_token = ?", [token], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

        db.run("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?", [user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Error verifying account' });
            res.json({ success: true, message: 'Account verified successfully! You can now login.' });
        });
    });
});

// --- Password Reset Routes ---

router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) {
            // Security: Don't reveal if email exists or not
            return res.json({ success: true, message: 'Se o e-mail existir, você receberá um link de redefinição.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 3600000).toISOString();

        db.run("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?", [resetToken, expiresAt, user.id], async (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            const { sendPasswordResetEmail } = require('../utils/emailService');
            // Send Password Reset Email (Asynchronous)
            sendPasswordResetEmail(email, resetToken).then(emailResult => {
                if (emailResult.success) {
                    console.log(`📬 E-mail de redefinição enviado para ${email}`);
                } else {
                    console.error('❌ Erro no e-mail de reset background:', emailResult.error);
                }
            }).catch(err => {
                console.error('🔥 Erro fatal no reset de e-mail:', err);
            });

            res.json({ success: true, message: 'Se o e-mail existir, você receberá um link de redefinição.' });
        });
    });
});

router.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Find user with valid token and token not expired
    db.get("SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')", [token], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) {
            return res.status(400).json({ error: 'Token inválido ou expirado.' });
        }

        const passwordHash = bcrypt.hashSync(newPassword, 10);

        db.run("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?", [passwordHash, user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, message: 'Senha redefinida com sucesso! Você pode fazer login agora.' });
        });
    });
});

module.exports = router;
