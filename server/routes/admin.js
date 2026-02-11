const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { TIER_LIST } = require('../config/plans');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';



// Health check for admin routes
router.get('/ping', (req, res) => res.json({ status: 'admin-api-online' }));

// Middleware to verify if user is Super Admin (adm_server)
function verifyAdmin(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

    jwt.verify(tokenString, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token' });

        // Real-time Check: Ensure admin is still active
        db.get("SELECT is_active, plan_tier FROM users WHERE id = ?", [decoded.id], (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!user) return res.status(404).json({ error: 'User not found' });

            if (user.is_active === 0) {
                return res.status(403).json({ error: 'Sua conta administrativa foi desativada.' });
            }

            if (user.plan_tier !== 'adm_server') {
                return res.status(403).json({ error: 'Access denied: Super Admin only' });
            }

            req.userId = decoded.id;
            next();
        });
    });
}

// List all users
router.get('/users', verifyAdmin, (req, res) => {

    db.all(`
        SELECT u.id, u.username, u.email, u.plan_tier, u.is_active, u.is_verified, 
        u.subscription_expires_at,
        strftime('%d/%m/%Y', u.created_at) as date_formatted,
        (SELECT COUNT(*) FROM visits v JOIN pages p ON v.slug = p.slug WHERE p.user_id = u.id AND v.is_admin_hit = 0) as total_visits,
        (SELECT slug FROM pages WHERE user_id = u.id LIMIT 1) as slug
        FROM users u
        ORDER BY u.created_at DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Update user tier
router.put('/users/:id/tier', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { plan_tier } = req.body;

    if (!TIER_LIST.includes(plan_tier)) {
        return res.status(400).json({ error: 'Invalid plan tier' });
    }

    db.run("UPDATE users SET plan_tier = ? WHERE id = ?", [plan_tier, id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'User tier updated successfully' });
    });
});

// Toggle user status (active/inactive)
router.put('/users/:id/status', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    db.run("UPDATE users SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id], function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: `User account ${is_active ? 'activated' : 'deactivated'} successfully` });
    });
});

// Delete user (and their pages)
router.delete('/users/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === req.userId) {
        return res.status(400).json({ error: 'You cannot delete your own admin account!' });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // 1. Delete visits related to user's pages
        db.run("DELETE FROM visits WHERE slug IN (SELECT slug FROM pages WHERE user_id = ?)", [id], (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: 'Error deleting user visits' });
            }

            // 2. Delete pages
            db.run("DELETE FROM pages WHERE user_id = ?", [id], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: 'Error deleting user pages' });
                }

                // 3. Delete user
                db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
                    if (err) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ error: 'Error deleting user account' });
                    }

                    db.run("COMMIT");
                    res.json({ message: 'Usuário e todos os dados associados excluídos com sucesso.' });
                });
            });
        });
    });
});

module.exports = router;
