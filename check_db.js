const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('campus_energy.db');

let output = '=== Tables in database ===\n';
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
    const count = db.prepare('SELECT COUNT(*) as count FROM [' + t.name + ']').get();
    const cols = db.prepare('PRAGMA table_info([' + t.name + '])').all();
    output += '\nTABLE: ' + t.name + '\n';
    output += 'ROWS: ' + count.count + '\n';
    output += 'COLS: ' + cols.map(c => c.name).join(', ') + '\n';
}
db.close();
fs.writeFileSync('db_report.txt', output, 'utf8');
console.log('Done - check db_report.txt');
