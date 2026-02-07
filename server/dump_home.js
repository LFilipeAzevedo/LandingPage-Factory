const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Dumping content for slug: home');
db.get("SELECT content FROM pages WHERE slug = 'home'", (err, row) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    if (!row) {
        console.log('Page not found');
        process.exit(0);
    }
    console.log('String Length:', row.content.length);
    try {
        const data = JSON.parse(row.content);
        console.log('Parse successful!');
        console.log('Keys:', Object.keys(data));
        if (data.customSections) {
            console.log('Custom Sections count:', data.customSections.length);
        }
    } catch (e) {
        console.log('Parse failed:', e.message);
        console.log('Start of string:', row.content.substring(0, 100));
        console.log('End of string:', row.content.substring(row.content.length - 100));
    }
    db.close();
});
