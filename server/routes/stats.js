const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';

// Middleware to verify token for stats access
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

    jwt.verify(tokenString, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token' });
        req.userId = decoded.id;
        next();
    });
}

router.get('/', verifyToken, (req, res) => {
    // Get the user's page slug first
    db.get("SELECT slug FROM pages WHERE user_id = ?", [req.userId], (err, page) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!page) return res.status(404).json({ error: 'No page found for this user' });

        const slug = page.slug;
        const stats = { total: 0, today: 0, week: 0 };

        db.get("SELECT COUNT(*) as count FROM visits WHERE slug = ? AND is_admin_hit = 0", [slug], (err, row) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            stats.total = row.count;

            db.get("SELECT COUNT(*) as count FROM visits WHERE slug = ? AND is_admin_hit = 0 AND timestamp > datetime('now', '-24 hours')", [slug], (err, row) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                stats.today = row.count;

                db.get("SELECT COUNT(*) as count FROM visits WHERE slug = ? AND is_admin_hit = 0 AND timestamp > datetime('now', '-7 days')", [slug], (err, row) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    stats.week = row.count;

                    const sql = `
                        SELECT 
                            strftime('%d/%m', timestamp) as date, 
                            COUNT(*) as count 
                        FROM visits 
                        WHERE slug = ? AND is_admin_hit = 0 AND timestamp > datetime('now', '-30 days') 
                        GROUP BY date 
                        ORDER BY timestamp ASC
                    `;

                    db.all(sql, [slug], (err, rows) => {
                        if (err) return res.status(500).json({ error: 'Database error' });
                        stats.daily = rows;

                        // Get recent REAL visits
                        db.all("SELECT strftime('%d/%m %H:%M', timestamp) as time FROM visits WHERE slug = ? AND is_admin_hit = 0 ORDER BY timestamp DESC LIMIT 5", [slug], (err, recent) => {
                            if (err) return res.status(500).json({ error: 'Database error' });
                            stats.recentVisits = recent;
                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
