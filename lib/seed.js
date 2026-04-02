import bcrypt from 'bcryptjs';
import { getDb as getMongoDb } from './mongodb.js';
import getSqliteDb from './db.js';

export async function seedDatabase() {
  // 1. Try MongoDB
  try {
    const db = await getMongoDb();
    if (db) {
      const seedDoc = await db.collection('meta').findOne({ _id: 'seeded' });
      if (!seedDoc || !seedDoc.done) {
        console.log('Starting MongoDB Seeding...');
        // ... (existing MongoDB seed logic)
        const adminHash = bcrypt.hashSync('admin123', 10);
        const userHash = bcrypt.hashSync('user123', 10);
        const users = [
          { _id: 'admin@campus.edu', name: 'Campus Admin', email: 'admin@campus.edu', password_hash: adminHash, role: 'admin', phone: '+91-9876543210', created_at: new Date().toISOString() },
          { _id: 'user@campus.edu', name: 'Building Operator', email: 'user@campus.edu', password_hash: userHash, role: 'user', phone: '+91-9876543211', created_at: new Date().toISOString() }
        ];
        for (const user of users) {
          await db.collection('users').updateOne({ _id: user._id }, { $set: user }, { upsert: true });
        }
        await db.collection('meta').updateOne({ _id: 'seeded' }, { $set: { done: true } }, { upsert: true });
        console.log('MongoDB Seeding Complete.');
      }
    }
  } catch (err) {
    console.error('MongoDB seed error:', err);
  }

  // 2. Local SQLite Seeding (if needed)
  try {
    const sqliteDb = getSqliteDb();
    // Simple check for users table data
    const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
      console.log('Starting SQLite Seeding...');
      const adminHash = bcrypt.hashSync('admin123', 10);
      const userHash = bcrypt.hashSync('user123', 10);
      sqliteDb.prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
        .run('Campus Admin', 'admin@campus.edu', adminHash, 'admin', new Date().toISOString());
      sqliteDb.prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
        .run('Building Operator', 'user@campus.edu', userHash, 'user', new Date().toISOString());
      console.log('SQLite Seeding Complete.');
    }
  } catch (err) {
    console.error('SQLite seed error:', err);
  }
}

export async function emptyAllData() {
  // 1. MongoDB
  try {
    const db = await getMongoDb();
    if (db) {
      const collections = ['users', 'blocks', 'buildings', 'rooms', 'energy_data', 'alerts', 'campus_codes', 'meta'];
      for (const name of collections) {
        await db.collection(name).deleteMany({});
      }
      console.log('All MongoDB data has been emptied.');
    }
  } catch (err) { }

  // 2. SQLite
  try {
    const sqliteDb = getSqliteDb();
    const tables = ['users', 'blocks', 'buildings', 'rooms', 'energy_data', 'alerts', 'campus_codes'];
    for (const table of tables) {
      sqliteDb.prepare(`DELETE FROM ${table}`).run();
    }
    console.log('All SQLite data has been emptied.');
  } catch (err) { }
}

export async function emptyInfrastructureData() {
  // 1. MongoDB
  try {
    const db = await getMongoDb();
    if (db) {
      const collections = ['blocks', 'buildings', 'rooms', 'energy_data', 'alerts'];
      for (const name of collections) {
        await db.collection(name).deleteMany({});
      }
      await db.collection('meta').deleteOne({ _id: 'seeded' });
      console.log('Infrastructure MongoDB data emptied.');
    }
  } catch (err) { }

  // 2. SQLite
  try {
    const sqliteDb = getSqliteDb();
    const tables = ['blocks', 'buildings', 'rooms', 'energy_data', 'alerts'];
    for (const table of tables) {
      sqliteDb.prepare(`DELETE FROM ${table}`).run();
    }
    console.log('Infrastructure SQLite data emptied.');
  } catch (err) { }
}
