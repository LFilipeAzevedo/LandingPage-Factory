const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkDb(dbPath) {
    console.log(`\n========================================`);
    console.log(`FILE: ${dbPath}`);
    return new Promise((resolve) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.log(`STATUS: ERROR - ${err.message}`);
                resolve();
                return;
            }
            db.all("SELECT id, username, email FROM users", [], (err, rows) => {
                if (err) {
                    console.log(`STATUS: TABLE ERROR - ${err.message}`);
                } else {
                    console.log(`STATUS: OK - Found ${rows.length} users`);
                    rows.forEach(row => console.log(` >> ID:${row.id} Name:${row.username} Email:${row.email}`));
                }
                db.close();
                resolve();
            });
        });
    });
}

const rootDb = path.resolve(__dirname, '..', 'database.sqlite');
const serverDb = path.resolve(__dirname, 'database.sqlite');

async function run() {
    await checkDb(rootDb);
    await checkDb(serverDb);
}

run();
