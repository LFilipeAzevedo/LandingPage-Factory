const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados.');
});

db.serialize(() => {
    console.log('\n🔄 Iniciando migração para adicionar suporte a e-mail...\n');

    // Adicionar coluna email
    db.run(`ALTER TABLE users ADD COLUMN email TEXT UNIQUE`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna email:', err.message);
        } else {
            console.log('✅ Coluna email adicionada');
        }
    });

    // Adicionar coluna is_verified
    db.run(`ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna is_verified:', err.message);
        } else {
            console.log('✅ Coluna is_verified adicionada');
        }
    });

    // Adicionar coluna verification_token
    db.run(`ALTER TABLE users ADD COLUMN verification_token TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna verification_token:', err.message);
        } else {
            console.log('✅ Coluna verification_token adicionada');
        }
    });

    // Marcar usuários existentes como verificados
    db.run(`UPDATE users SET is_verified = 1 WHERE is_verified IS NULL OR is_verified = 0`, function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar usuários existentes:', err.message);
        } else {
            console.log(`✅ ${this.changes} usuário(s) existente(s) marcado(s) como verificado(s)`);
        }

        console.log('\n✨ Migração concluída com sucesso!\n');
        db.close();
    });
});
