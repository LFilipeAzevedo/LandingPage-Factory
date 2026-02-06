const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('Target DB:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) throw err;

    db.all("SELECT id, username, is_verified, typeof(is_verified) as type FROM users", [], (err, rows) => {
        if (err) throw err;
        console.log("--- User Verification Audit ---");
        console.table(rows);
        db.close();
    });
});
