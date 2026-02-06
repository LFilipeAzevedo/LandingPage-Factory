const express = require('express');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';

// Verify Token Middleware (Same as in content.js - in a real app, should be in a separate file)
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

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use absolute path to ensure certainty, pointing to the Volume-persistent folder
        const uploadDir = path.join(__dirname, '../data/uploads');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Upload Endpoint
router.post('/', verifyToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Construct full URL (assuming server is running on localhost/IP)
    // We'll return a relative path or full URL. Let's return the relative path that the frontend can prepend base URL to, or better yet, a path that works with the static server.
    // Index.js serves '/uploads' -> 'server/uploads'

    // We rely on the client to know the server base URL, OR we return a path like '/uploads/filename.jpg' 
    // and ensuring index.js serves that route.

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({ url: fileUrl });
});

module.exports = router;
