const db = require('./config/db');
const fs = require('fs');
const path = require('path');

const setupDatabase = async () => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await db.query(schema);
        console.log('Database tables created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error creating database tables:', err);
        process.exit(1);
    }
};

setupDatabase();
