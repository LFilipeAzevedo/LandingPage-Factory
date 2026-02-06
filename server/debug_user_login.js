const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) throw err;

    db.get("SELECT * FROM users WHERE username = 'AlessandraNails'", [], (err, row) => {
        if (err) throw err;
        console.log("--- User Data for AlessandraNails ---");
        console.log(JSON.stringify(row, null, 2));
        db.close();
    });
});
