const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function checkDb(dbPath) {
    console.log(`\n--- Checking: ${dbPath} ---`);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(`Error opening ${dbPath}:`, err.message);
            return;
        }
        db.all("SELECT id, username, email FROM users", [], (err, rows) => {
            if (err) {
                console.error(`Error querying ${dbPath}:`, err.message);
            } else {
                console.log(`Users found (${rows.length}):`);
                rows.forEach(row => console.log(` - ID: ${row.id}, User: ${row.username}, Email: ${row.email}`));
            }
            db.close();
        });
    });
}

const rootDb = path.join(__dirname, '..', 'database.sqlite');
const serverDb = path.join(__dirname, 'database.sqlite');

checkDb(rootDb);
checkDb(serverDb);
