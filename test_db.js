
import getDb from './lib/db.js';
import { seedDatabase } from './lib/seed.js';

try {
    const db = getDb();
    console.log('Database connection successful');
    seedDatabase();
    console.log('Database seeding successful');
    const user = db.prepare('SELECT * FROM users LIMIT 1').get();
    console.log('User found:', user);
} catch (err) {
    console.error('Database test failed:', err);
}
