const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error:', err.message);
        return;
    }

    console.log('--- TABLES ---');
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) throw err;
        tables.forEach(t => {
            console.log(`Table: ${t.name}`);
            db.all(`PRAGMA table_info(${t.name})`, [], (err, info) => {
                info.forEach(col => console.log(`  - ${col.name} (${col.type})`));
            });
        });

        console.log('\n--- TEMPLATE USERS ---');
        db.all("SELECT id, username, plan_tier FROM users WHERE username IN ('premium_user', 'static_user', 'basic_user')", [], (err, rows) => {
            rows.forEach(r => console.log(`User ID: ${r.id}, Name: ${r.username}, Tier: ${r.plan_tier}`));
            db.close();
        });
    });
});
