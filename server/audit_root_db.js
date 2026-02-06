const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'database.sqlite');
console.log('Target DB (ROOT):', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log("No root database found or accessible.");
        return;
    }

    db.all("SELECT id, username, is_verified, typeof(is_verified) as type FROM users", [], (err, rows) => {
        if (err) {
            console.log("Error querying root database: Table might not exist.");
        } else {
            console.log("--- ROOT DB User Verification Audit ---");
            console.table(rows);
        }
        db.close();
    });
});
