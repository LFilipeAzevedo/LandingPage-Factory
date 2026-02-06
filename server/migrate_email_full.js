const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
        process.exit(1);
    }
    console.log('Conectado ao banco de dados.');
});

db.serialize(() => {
    console.log('\n🔄 Iniciando migração completa da tabela users...\n');

    // 1. Criar nova tabela com estrutura atualizada
    db.run(`CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT,
        plan_tier TEXT DEFAULT 'premium',
        is_verified BOOLEAN DEFAULT 0,
        verification_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela nova:', err.message);
            db.close();
            return;
        }
        console.log('✅ Tabela users_new criada');

        // 2. Copiar dados da tabela antiga (sem created_at)
        db.run(`INSERT INTO users_new (id, username, password_hash, plan_tier, is_verified)
                SELECT id, username, password_hash, plan_tier, 1 FROM users`, function (err) {
            if (err) {
                console.error('❌ Erro ao copiar dados:', err.message);
                db.close();
                return;
            }
            console.log(`✅ ${this.changes} usuário(s) copiado(s) (marcados como verificados)`);

            // 3. Remover tabela antiga
            db.run(`DROP TABLE users`, (err) => {
                if (err) {
                    console.error('❌ Erro ao remover tabela antiga:', err.message);
                    db.close();
                    return;
                }
                console.log('✅ Tabela antiga removida');

                // 4. Renomear nova tabela
                db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
                    if (err) {
                        console.error('❌ Erro ao renomear tabela:', err.message);
                    } else {
                        console.log('✅ Tabela renomeada para users');
                        console.log('\n✨ Migração concluída com sucesso!');
                        console.log('🔄 Reinicie o servidor para aplicar as mudanças.\n');
                    }
                    db.close();
                });
            });
        });
    });
});
