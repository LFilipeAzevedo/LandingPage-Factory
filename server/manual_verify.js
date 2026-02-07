const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/database.sqlite');
const db = new sqlite3.Database(dbPath);

const emailToVerify = 'lfilipeazevedoo@gmail.com';

db.serialize(() => {
    db.run("UPDATE users SET is_verified = 1 WHERE email = ?", [emailToVerify], function (err) {
        if (err) {
            console.error('Error updating user:', err.message);
        } else {
            console.log(`Row(s) updated: ${this.changes}`);
            if (this.changes > 0) {
                console.log(`User with email ${emailToVerify} has been manually verified.`);
            } else {
                console.log(`No user found with email ${emailToVerify}.`);
            }
        }
    });
});

db.close();
