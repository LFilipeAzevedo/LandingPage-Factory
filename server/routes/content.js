const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';

// Middleware to verify token
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    // Bearer <token>
    const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

    jwt.verify(tokenString, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token' });
        req.userId = decoded.id;
        next();
    });
}

// Get Page Content (Public)
router.get('/:slug', (req, res) => {
    const slug = req.params.slug;

    // Join with users to get plan_tier
    const query = `
        SELECT p.content, p.user_id, u.plan_tier 
        FROM pages p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.slug = ?
    `;

    db.get(query, [slug], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Page not found' });

        // Record real visit if track param is present
        if (req.query.track === 'true') {
            const authHeader = req.headers['authorization'];
            let isAdminHit = 0;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const ipHash = require('crypto').createHash('md5').update(ip || '').digest('hex');

            if (authHeader) {
                const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
                try {
                    const decoded = jwt.verify(token, SECRET_KEY);
                    if (decoded.id === row.user_id) {
                        isAdminHit = 1;
                    }
                } catch (e) {
                    // Invalid token, treat as normal user
                }
            }

            // Deduplication: Only record if no visit from same IP/Slug in the last 30 minutes
            // (Unless it's an admin hit, we might want to record it but flag as admin)
            const checkSql = "SELECT id FROM visits WHERE slug = ? AND ip_hash = ? AND timestamp > datetime('now', '-30 minutes') LIMIT 1";
            db.get(checkSql, [slug, ipHash], (err, lastVisit) => {
                if (!lastVisit) {
                    db.run("INSERT INTO visits (slug, ip_hash, is_admin_hit) VALUES (?, ?, ?)", [slug, ipHash, isAdminHit]);
                }
            });
        }

        try {
            let content = JSON.parse(row.content);

            // --- PLAN ENFORCEMENT & SANITIZATION ---
            // If user is NOT Premium, disable Premium features (Non-Destructive)
            if (row.plan_tier !== 'premium') {
                if (content.salesSection) {
                    content.salesSection.enabled = false;
                }
                // Future: Enforce footer branding for Free tier
                // if (row.plan_tier === 'static') { ... }
            }
            // ---------------------------------------

            res.json(content);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error parsing content' });
        }
    });
});

// Route for a user to see their own page in the editor
router.get('/admin/my-page', verifyToken, (req, res) => {
    // adm_server users have full access regardless, but let's check content exists
    db.get("SELECT p.slug, p.content FROM pages p JOIN users u ON p.user_id = u.id WHERE u.id = ?", [req.userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'No page found for this user' });

        try {
            res.json({
                slug: row.slug,
                content: JSON.parse(row.content)
            });
        } catch (e) {
            res.status(500).json({ error: 'Error parsing content' });
        }
    });
});

// Update Page Content (Protected)
router.put('/:slug', verifyToken, (req, res) => {
    const slug = req.params.slug;
    const newContent = req.body;

    // First check if the user owns this page
    db.get("SELECT user_id FROM pages WHERE slug = ?", [slug], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Page not found' });

        if (row.user_id !== req.userId) {
            return res.status(403).json({ error: 'You do not have permission to edit this page' });
        }

        const contentString = JSON.stringify(newContent);
        db.run("UPDATE pages SET content = ? WHERE slug = ?", [contentString, slug], function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Content updated successfully' });
        });
    });
});

module.exports = router;
