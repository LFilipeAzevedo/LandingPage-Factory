const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - dynamic based on environment
const corsOptions = {
    origin: process.env.URL_FRONTEND || process.env.FRONTEND_URL || '*', // Fallback for local dev
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const uploadRoutes = require('./routes/upload.js');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'data/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// --- Configuração para Deploy Railway (Servir Frontend) ---
// Servir arquivos estáticos do React (após o build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Middleware final para suportar React Router (SPA)
// Qualquer rota que não for API ou Arquivo Estático cairá aqui
app.use((req, res) => {
    // Se não for uma rota de API, entrega o index.html do React
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
        res.status(404).json({ message: 'API route not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
