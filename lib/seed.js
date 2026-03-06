import bcrypt from 'bcryptjs';
import getDb from './db.js';

export function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const seeded = db.prepare('SELECT done FROM seeded WHERE id = 1').get();
  if (seeded?.done) return;

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('user123', 10);

  // Insert users without specifying IDs to let autoincrement work
  db.exec(`
    INSERT OR IGNORE INTO users (name, email, password_hash, role, phone) VALUES
      ('Campus Admin', 'admin@campus.edu', '${adminHash}', 'admin', '+91-9876543210'),
      ('Building Operator', 'user@campus.edu', '${userHash}', 'user', '+91-9876543211'),
      ('Tech Staff', 'tech@campus.edu', '${userHash}', 'user', '+91-9876543212');
  `);

  // Insert blocks without specifying IDs
  db.exec(`
    INSERT OR IGNORE INTO blocks (name, description) VALUES
      ('Block A', 'Academic Block - Science & Engineering'),
      ('Block B', 'Administrative & Humanities Block'),
      ('Block C', 'Sports & Recreation Block');
  `);

  // Insert buildings without specifying IDs
  db.exec(`
    INSERT OR IGNORE INTO buildings (name, block_id) VALUES
      ('Building A1', (SELECT id FROM blocks WHERE name = 'Block A')),
      ('Building A2', (SELECT id FROM blocks WHERE name = 'Block A')),
      ('Building B1', (SELECT id FROM blocks WHERE name = 'Block B')),
      ('Building B2', (SELECT id FROM blocks WHERE name = 'Block B')),
      ('Building C1', (SELECT id FROM blocks WHERE name = 'Block C')),
      ('Building C2', (SELECT id FROM blocks WHERE name = 'Block C'));
  `);

  // Insert rooms without specifying IDs
  db.exec(`
    INSERT OR IGNORE INTO rooms (room_name, building_id, sensor_id, capacity, threshold_kwh) VALUES
      ('Room 101', (SELECT id FROM buildings WHERE name = 'Building A1'), 'SEN-A1-101', 40, 50),
      ('Room 102', (SELECT id FROM buildings WHERE name = 'Building A1'), 'SEN-A1-102', 35, 45),
      ('Room 103', (SELECT id FROM buildings WHERE name = 'Building A1'), 'SEN-A1-103', 30, 40),
      ('Room 201', (SELECT id FROM buildings WHERE name = 'Building A2'), 'SEN-A2-201', 50, 60),
      ('Room 202', (SELECT id FROM buildings WHERE name = 'Building A2'), 'SEN-A2-202', 40, 50),
      ('Room 203', (SELECT id FROM buildings WHERE name = 'Building A2'), 'SEN-A2-203', 35, 45),
      ('Room 301', (SELECT id FROM buildings WHERE name = 'Building B1'), 'SEN-B1-301', 60, 70),
      ('Room 302', (SELECT id FROM buildings WHERE name = 'Building B1'), 'SEN-B1-302', 45, 55),
      ('Room 303', (SELECT id FROM buildings WHERE name = 'Building B1'), 'SEN-B1-303', 40, 50),
      ('Room 401', (SELECT id FROM buildings WHERE name = 'Building B2'), 'SEN-B2-401', 55, 65),
      ('Room 402', (SELECT id FROM buildings WHERE name = 'Building B2'), 'SEN-B2-402', 45, 55),
      ('Room 403', (SELECT id FROM buildings WHERE name = 'Building B2'), 'SEN-B2-403', 35, 45),
      ('Room 501', (SELECT id FROM buildings WHERE name = 'Building C1'), 'SEN-C1-501', 80, 90),
      ('Room 502', (SELECT id FROM buildings WHERE name = 'Building C1'), 'SEN-C1-502', 75, 85),
      ('Room 503', (SELECT id FROM buildings WHERE name = 'Building C1'), 'SEN-C1-503', 60, 70),
      ('Room 601', (SELECT id FROM buildings WHERE name = 'Building C2'), 'SEN-C2-601', 70, 80),
      ('Room 602', (SELECT id FROM buildings WHERE name = 'Building C2'), 'SEN-C2-602', 65, 75),
      ('Room 603', (SELECT id FROM buildings WHERE name = 'Building C2'), 'SEN-C2-603', 50, 60);
  `);

  // Generate 30 days of energy data
  const insertEnergy = db.prepare(`
    INSERT OR IGNORE INTO energy_data (room_id, date, energy_consumption_kwh, uploaded_by, notes)
    VALUES (?, ?, ?, 1, ?)
  `);

  const baseConsumptions = [42, 38, 35, 55, 48, 41, 65, 52, 46, 60, 50, 40, 85, 78, 65, 72, 68, 55];

  // Insert energy data one by one to avoid transaction issues
  for (let day = 29; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    // Get all room IDs
    const rooms = db.prepare('SELECT id FROM rooms ORDER BY id').all();

    for (let i = 0; i < rooms.length; i++) {
      const roomId = rooms[i].id;
      const base = baseConsumptions[i] || 50; // Default to 50 if we have more rooms than base values
      const variation = (Math.random() - 0.5) * base * 0.3;
      const weekendReduction = [0, 6].includes(date.getDay()) ? 0.6 : 1.0;
      const consumption = Math.max(5, (base + variation) * weekendReduction);

      try {
        insertEnergy.run(roomId, dateStr, parseFloat(consumption.toFixed(2)), day === 0 ? 'Today auto-logged' : null);
      } catch (error) {
        console.log('Skipping energy data insertion for room', roomId, 'on', dateStr, ':', error.message);
      }
    }
  }

  // Sample alerts
  db.exec(`
    INSERT OR IGNORE INTO alerts (room_id, message, sent_to, status, alert_type) VALUES
      ((SELECT id FROM rooms WHERE room_name = 'Room 201'), 'Energy consumption exceeded threshold: 68 kWh (limit: 60 kWh)', 'building-operator@campus.edu', 'sent', 'auto'),
      ((SELECT id FROM rooms WHERE room_name = 'Room 501'), 'Critical: Room 501 consuming 98 kWh - 9% above threshold', 'sports-head@campus.edu', 'sent', 'auto'),
      ((SELECT id FROM rooms WHERE room_name = 'Room 301'), 'Shutdown alert: Room 301 peak consumption detected', 'b-block-admin@campus.edu', 'pending', 'manual');
  `);

  // Default campus codes for joining
  db.exec(`
    INSERT OR IGNORE INTO campus_codes (code, created_by, is_active) VALUES
      ('CAMPUS2024', 1, 1),
      ('ENERGY2024', 1, 1),
      ('OPTIWATT', 1, 1);
  `);

  db.prepare('INSERT OR REPLACE INTO seeded (id, done) VALUES (1, 1)').run();
}

export function emptyAllData() {
  const db = getDb();

  // Delete all data from tables in order to respect foreign key constraints
  db.exec(`
        DELETE FROM energy_data;
        DELETE FROM alerts;
        DELETE FROM rooms;
        DELETE FROM buildings;
        DELETE FROM blocks;
        DELETE FROM users;
        DELETE FROM seeded;
    `);

  console.log('All data has been emptied from the database.');
}

export function emptyInfrastructureData() {
  const db = getDb();

  // Delete only infrastructure data, keep users
  db.exec(`
        DELETE FROM energy_data;
        DELETE FROM alerts;
        DELETE FROM rooms;
        DELETE FROM buildings;
        DELETE FROM blocks;
        DELETE FROM seeded;
    `);

  console.log('Infrastructure data (blocks, buildings, rooms, energy data, alerts) has been emptied. Users preserved.');
}
