const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    db.get("SELECT content FROM pages WHERE slug = 'home'", (err, row) => {
        if (err) {
            console.error(err);
            return;
        }
        if (row) {
            const content = JSON.parse(row.content);

            // Fix Nav Links
            content.navLinks = [
                { label: 'Sobre nós', url: '#about' },
                { label: 'Eventos', url: '#events' },
                { label: 'Estações', url: '#stations' }
            ];

            // Ensure other new fields if missing
            if (!content.heroImageSettings) content.heroImageSettings = { position: 'center', size: 'cover' };
            if (!content.aboutText) content.aboutText = '';

            // Default socials if missing
            if (!content.socials) content.socials = { instagram: '', whatsapp: '' };

            const newContent = JSON.stringify(content);

            db.run("UPDATE pages SET content = ? WHERE slug = 'home'", [newContent], (err) => {
                if (err) console.error("Error updating content:", err);
                else console.log("Database updated successfully with correct nav links.");
            });
        } else {
            console.log("No home page found to update.");
        }
    });
});
