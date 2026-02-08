const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Connect to database (now inside a folder for easier persistence)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database at:', dbPath);
        // Prevent SQLITE_BUSY errors by waiting for locks to release
        db.run("PRAGMA busy_timeout = 5000");
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Create Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            plan_tier TEXT DEFAULT 'basic', -- 'static', 'basic', 'premium', 'adm_server'
            is_verified BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            verification_token TEXT,
            reset_token TEXT,
            reset_token_expires DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: Ensure reset_token columns exist (for existing DBs)
        db.run("ALTER TABLE users ADD COLUMN reset_token TEXT", (err) => {
            if (err && !err.message.includes("duplicate column name")) {
                console.error("Migration/Check (reset_token):", err.message);
            }
        });
        db.run("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME", (err) => {
            if (err && !err.message.includes("duplicate column name")) {
                console.error("Migration/Check (reset_token_expires):", err.message);
            }
        });

        // Create Pages Table
        db.run(`CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            slug TEXT UNIQUE,
            content TEXT,
            is_published BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Create Visits Table
        db.run(`CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT,
            ip_hash TEXT,
            is_admin_hit BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed Default User (from .env)
        const defaultUser = process.env.ADMIN_USERNAME || 'LuizFactoryAdm';
        const defaultPass = process.env.ADMIN_PASSWORD;

        if (!defaultPass) {
            console.warn("⚠️  Aviso: ADMIN_PASSWORD não configurado no .env. Ignorando criação do usuário admin padrão.");
            return;
        }

        // Cleanup: Remove old placeholder users that were used as templates
        const placeholderUsers = ['premium_user', 'static_user', 'basic_user'];
        db.run(`DELETE FROM users WHERE username IN (${placeholderUsers.map(() => '?').join(',')})`, placeholderUsers, (err) => {
            if (err) console.error("Error during placeholder cleanup:", err);
            else {
                // Also clean their pages (cascade not explicit here)
                db.run("DELETE FROM pages WHERE user_id NOT IN (SELECT id FROM users)");
            }
        });

        db.get("SELECT * FROM users WHERE username = ?", [defaultUser], (err, user) => {
            if (!user) {
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync(defaultPass, salt);
                db.run("INSERT INTO users (username, password_hash, plan_tier, is_verified) VALUES (?, ?, ?, ?)", [defaultUser, hash, 'adm_server', 1], function (err) {
                    if (err) console.error("Error creating default user:", err);
                    else {
                        console.log("Default user created: LuizFactoryAdm (Verified)");
                        seedPage(this.lastID);
                    }
                });
            } else {
                seedPage(user.id);
            }
        });

        function seedPage(userId) {
            const initialContent = JSON.stringify({
                heroTitle: "Bem-vindo ao Seu Site Incrível",
                heroSubtitle: "A melhor solução para o seu negócio crescer online com rapidez e eficiência.",
                heroImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
                features: [
                    { title: "Personalização Fácil", description: "Edite textos e imagens em tempo real." },
                    { title: "Design Responsivo", description: "Funciona perfeitamente em mobile e desktop." },
                    { title: "Alta Performance", description: "Seu site carrega instantaneamente." }
                ],
                ctaText: "Começar Agora",
                footerText: "© 2026 Todos os direitos reservados."
            });

            db.get("SELECT * FROM pages WHERE slug = 'home'", (err, row) => {
                if (!row) {
                    db.run("INSERT INTO pages (slug, content, user_id) VALUES (?, ?, ?)", ['home', initialContent, userId], (err) => {
                        if (err) console.error("Error creating default page:", err);
                        else console.log("Default page content created for user", userId);
                    });
                } else {
                    // Force update the owner of 'home' page to the current Admin User
                    // This fixes issues where 'home' belongs to an old/deleted user ID on a persisted DB
                    if (row.user_id !== userId) {
                        db.run("UPDATE pages SET user_id = ? WHERE id = ?", [userId, row.id], (err) => {
                            if (err) console.error("Error updating page owner:", err);
                            else console.log(`Page 'home' ownership transferred to user ${userId}`);
                        });
                    }
                }
            });
        }
    });
}

module.exports = db;
