const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - dynamic based on environment
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', // Fallback for local dev
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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// --- Configuração para Deploy Railway (Servir Frontend) ---
// Servir arquivos estáticos do React (após o build)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Rota coringa para suportar React Router (SPA)
app.get('(.*)', (req, res) => {
    // Se for uma rota de API que não existe, o Express cairia aqui, 
    // mas priorizamos as rotas /api definidas acima.
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    } else {
        res.status(404).json({ message: 'API route not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
