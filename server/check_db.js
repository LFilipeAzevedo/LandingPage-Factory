const db = require('./db');

db.get("SELECT users.username, users.plan_tier, pages.slug FROM users LEFT JOIN pages ON users.id = pages.user_id ORDER BY users.id DESC LIMIT 1;", (err, row) => {
    if (err) {
        console.error("Error checking database:", err);
        process.exit(1);
    }
    console.log("Latest User & Page:", row);
    db.close();
});
