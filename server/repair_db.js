const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'data', 'database.sqlite'); // Correct path based on db.js
const db = new sqlite3.Database(dbPath);

db.get("SELECT content FROM pages WHERE slug = 'home'", (err, row) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    if (!row) {
        console.log('Home page not found');
        process.exit(0);
    }

    try {
        let content = JSON.parse(row.content);
        if (!content.customSections) {
            content.customSections = [];
            console.log('Added missing customSections array.');
        }

        const updatedContent = JSON.stringify(content);
        db.run("UPDATE pages SET content = ? WHERE slug = 'home'", [updatedContent], (err) => {
            if (err) console.error('Error updating:', err);
            else console.log('Successfully repaired home page JSON.');
            db.close();
        });
    } catch (e) {
        console.log('JSON is badly corrupted, attempting partial recovery...');
        // If it's too corrupted to parse, we might need a fallback or deep repair
        // But the previous dump said "Parse successful", so it should work.
        console.error(e);
        db.close();
    }
});
