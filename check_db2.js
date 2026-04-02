const Database = require('better-sqlite3');
const db = new Database('campus_energy.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
    const c = db.prepare('SELECT COUNT(*) as c FROM [' + t.name + ']').get();
    process.stdout.write(t.name + ' = ' + c.c + '\n');
}
db.close();
