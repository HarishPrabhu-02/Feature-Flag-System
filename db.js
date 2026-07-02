const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs'); 
const path = require('path');

async function initDb() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT CHECK(role IN ('ORG_ADMIN', 'END_USER')) NOT NULL,
            FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS feature_flags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            feature_key TEXT NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT 0,
            FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
            UNIQUE(organization_id, feature_key)
        );
    `);

    const testUser = await db.get('SELECT * FROM users WHERE email = ?', ['admin@nike.com']);
    
    if (!testUser) {
        console.log("First boot detected. Seeding test data...");
        
        const orgResult = await db.run('INSERT INTO organizations (name) VALUES (?)', ['Nike']);
        const orgId = orgResult.lastID;
        
        const hash = bcrypt.hashSync('password123', 10);
        await db.run(
            'INSERT INTO users (organization_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [orgId, 'admin@nike.com', hash, 'ORG_ADMIN']
        );
        
        console.log("Seed complete: Org 'Nike' and user 'admin@nike.com' are ready to use.");
    }

    return db;
}

module.exports = initDb;