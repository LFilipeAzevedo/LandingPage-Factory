const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // BLOCK login if NOT verified
        if (user.is_verified === 0) {
            return res.status(403).json({
                error: 'Account not verified. Please check your email.',
                requiresVerification: true
            });
        }

        const passwordIsValid = bcrypt.compareSync(password, user.password_hash);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid credentials' });

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
    const { username, password, email } = req.body;
    console.log('📝 Tentativa de registro:', { username, email });

    if (!username || !password || !email) {
        console.log('❌ Campos obrigatórios faltando');
        return res.status(400).json({ error: 'Username, password and email are required' });
    }

    // Check if user or email already exists
    db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], (err, existingUser) => {
        if (err) {
            console.error('❌ Erro ao verificar usuário:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (existingUser) {
            console.log('❌ Usuário ou e-mail já existe');
            return res.status(400).json({ error: 'Username or email already taken' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const planTier = 'basic'; // Default tier for new signups
        const verificationToken = crypto.randomBytes(32).toString('hex');

        db.run("INSERT INTO users (username, email, password_hash, plan_tier, verification_token) VALUES (?, ?, ?, ?, ?)",
            [username, email, passwordHash, planTier, verificationToken], function (err) {
                if (err) {
                    console.error('❌ Erro ao criar usuário:', err.message);
                    return res.status(500).json({ error: 'Error creating user: ' + err.message });
                }
                console.log('✅ Usuário criado com ID:', this.lastID);

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
                    console.log('✅ Página criada com slug:', defaultSlug);

                    // Send Verification Email
                    const emailResult = await sendVerificationEmail(email, username, verificationToken);
                    console.log('✅ Registro concluído com sucesso');

                    res.status(201).json({
                        success: true,
                        message: emailResult.success
                            ? 'Register successful! Please check your email to verify your account.'
                            : 'Conta criada, mas houve um erro ao enviar o e-mail de verificação. Por favor, contate o suporte ou verifique as configurações de SMTP.',
                        emailSent: emailResult.success,
                        emailError: emailResult.error || null
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

module.exports = router;
