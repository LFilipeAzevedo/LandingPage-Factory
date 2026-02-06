const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) throw err;

    const placeholders = ['premium_user', 'static_user', 'basic_user'];
    console.log('--- CLEANING UP PLACEHOLDERS ---');

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(`DELETE FROM users WHERE username IN (${placeholders.map(() => '?').join(',')})`, placeholders, function (err) {
            if (err) console.error(err);
            else console.log(`Users deleted: ${this.changes}`);
        });

        db.run("DELETE FROM pages WHERE user_id NOT IN (SELECT id FROM users)", function (err) {
            if (err) console.error(err);
            else console.log(`Orphaned pages deleted: ${this.changes}`);
        });

        db.run("COMMIT", (err) => {
            if (err) console.error("Commit failed", err);
            else console.log("Cleanup successful!");
            db.close();
        });
    });
});
