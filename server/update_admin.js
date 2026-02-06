const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('--- Script de Manutenção de Admin ---');
console.log('Conectando ao banco em:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Garantir coluna is_active
    db.run("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('OK: Coluna is_active já existe.');
            } else {
                console.error('Erro ao adicionar coluna:', err.message);
            }
        } else {
            console.log('SUCESSO: Coluna is_active adicionada.');
        }
    });

    // 2. Promover admin
    db.run("UPDATE users SET plan_tier = 'adm_server', is_active = 1 WHERE username = 'admin'", function (err) {
        if (err) {
            console.error('ERRO ao promover admin:', err.message);
        } else {
            console.log('SUCESSO: Usuário admin atualizado. Linhas afetadas:', this.changes);
        }
    });

    // 3. Verificar estado final
    db.get("SELECT id, username, plan_tier, is_active FROM users WHERE username = 'admin'", (err, row) => {
        if (err) {
            console.error('Erro ao verificar:', err.message);
        } else if (row) {
            console.log('ESTADO ATUAL DO ADMIN:', row);
        } else {
            console.log('AVISO: Usuário admin não encontrado.');
        }
        db.close();
    });
});
