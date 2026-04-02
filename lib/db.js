import Database from 'better-sqlite3';
import path from 'path';

let db;

export default function getDb() {
    if (!db) {
        db = new Database(path.join(process.cwd(), 'campus_energy.db'));
        // Disable foreign key constraints to allow flexible data entry
        // Foreign keys can be re-enabled once data relationships are properly set up
        db.pragma('foreign_keys = OFF');
    }
    return db;
}
