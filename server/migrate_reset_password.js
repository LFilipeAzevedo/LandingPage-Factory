const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Running migration: Add reset_token columns to users table...');

    db.run("ALTER TABLE users ADD COLUMN reset_token TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column reset_token already exists.');
            } else {
                console.error('Error adding reset_token:', err.message);
            }
        } else {
            console.log('Column reset_token added successfully.');
        }
    });

    db.run("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column reset_token_expires already exists.');
            } else {
                console.error('Error adding reset_token_expires:', err.message);
            }
        } else {
            console.log('Column reset_token_expires added successfully.');
        }
    });
});

db.close(() => {
    console.log('Migration finished.');
});
