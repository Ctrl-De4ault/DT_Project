
import getDb from './lib/db.js';
import { seedDatabase } from './lib/seed.js';

async function runTest() {
    try {
        console.log('Testing Database Connection...');
        const db = getDb();
        console.log('Database Connection Successful');

        console.log('Testing Database Seeding...');
        seedDatabase();
        console.log('Database Seeding Successful');

        console.log('Testing User Retrieval...');
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@campus.edu');
        if (user) {
            console.log('User Found:', user.email);
        } else {
            console.log('User NOT Found');
        }

        process.exit(0);
    } catch (err) {
        console.error('FATAL ERROR:', err);
        process.exit(1);
    }
}

runTest();
