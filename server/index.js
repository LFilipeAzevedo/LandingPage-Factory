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
    // Se não for uma rota de API, tenta entregar o index.html do React
    if (!req.path.startsWith('/api')) {
        const indexPath = path.join(__dirname, '../client/dist/index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            // Se o arquivo não existir (em dev local), avisa de forma amigável
            res.status(200).send(`
                <div style="font-family: sans-serif; padding: 2rem; text-align: center;">
                    <h1>Backend Online 🚀</h1>
                    <p>O servidor está funcionando! Como você está em <b>desenvolvimento local</b>, use a porta do Vite para ver o site:</p>
                    <a href="http://localhost:5173" style="color: #6366f1; font-weight: bold; font-size: 1.2rem;">http://localhost:5173</a>
                    <p style="color: #666; font-size: 0.8rem; margin-top: 2rem;">Nota: A pasta 'dist' (produção) não foi encontrada, o que é normal no seu computador.</p>
                </div>
            `);
        }
    } else {
        res.status(404).json({ message: 'API route not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
