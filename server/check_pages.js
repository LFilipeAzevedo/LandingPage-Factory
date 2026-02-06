const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

console.log(`Checking PAGES in: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening DB:', err.message);
        return;
    }
    db.all("SELECT id, user_id, slug, is_published FROM pages", [], (err, rows) => {
        if (err) {
            console.error('Error querying pages:', err.message);
        } else {
            console.log(`Pages found (${rows.length}):`);
            rows.forEach(row => console.log(` - ID: ${row.id}, UserID: ${row.user_id}, Slug: ${row.slug}, Published: ${row.is_published}`));
        }
        db.close();
    });
});
