const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    console.log("Checking columns for 'users' table...");
    db.all("PRAGMA table_info(users)", (err, rows) => {
        const columns = rows.map(r => r.name);
        if (!columns.includes('plan_tier')) {
            db.run("ALTER TABLE users ADD COLUMN plan_tier TEXT DEFAULT 'premium'", (err) => {
                if (!err) console.log("Added 'plan_tier' to 'users'.");
            });
        }
        if (!columns.includes('created_at')) {
            db.run("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
                if (!err) console.log("Added 'created_at' to 'users'.");
            });
        }
    });

    console.log("Checking columns for 'pages' table...");
    db.all("PRAGMA table_info(pages)", (err, rows) => {
        const columns = rows.map(r => r.name);
        if (!columns.includes('user_id')) {
            db.run("ALTER TABLE pages ADD COLUMN user_id INTEGER", (err) => {
                if (!err) console.log("Added 'user_id' to 'pages'.");
            });
        }
        if (!columns.includes('is_published')) {
            db.run("ALTER TABLE pages ADD COLUMN is_published BOOLEAN DEFAULT 1", (err) => {
                if (!err) console.log("Added 'is_published' to 'pages'.");
            });
        }
    });
});

setTimeout(() => {
    db.close();
    console.log("Migration finished.");
}, 2000);
