import bcrypt from 'bcryptjs';
import { getDb } from './mongodb.js';

export async function seedDatabase() {
  const db = await getDb();

  // Check if already seeded - using a 'meta' collection
  const seedDoc = await db.collection('meta').findOne({ _id: 'seeded' });
  if (seedDoc && seedDoc.done) {
    return;
  }

  console.log('Starting MongoDB Seeding...');

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('user123', 10);

  // Users
  const users = [
    { _id: 'admin@campus.edu', name: 'Campus Admin', email: 'admin@campus.edu', password_hash: adminHash, role: 'admin', phone: '+91-9876543210', created_at: new Date().toISOString() },
    { _id: 'user@campus.edu', name: 'Building Operator', email: 'user@campus.edu', password_hash: userHash, role: 'user', phone: '+91-9876543211', created_at: new Date().toISOString() },
    { _id: 'tech@campus.edu', name: 'Tech Staff', email: 'tech@campus.edu', password_hash: userHash, role: 'user', phone: '+91-9876543212', created_at: new Date().toISOString() }
  ];

  for (const user of users) {
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: user },
      { upsert: true }
    );
  }

  // Blocks
  const blocksData = [
    { name: 'Block A', description: 'Academic Block - Science & Engineering' },
    { name: 'Block B', description: 'Administrative & Humanities Block' },
    { name: 'Block C', description: 'Sports & Recreation Block' }
  ];

  const blockIds = {};
  for (const block of blocksData) {
    const result = await db.collection('blocks').insertOne({ ...block, created_at: new Date().toISOString() });
    blockIds[block.name] = result.insertedId;
  }

  // Buildings
  const buildingsData = [
    { name: 'Building A1', blockName: 'Block A' },
    { name: 'Building A2', blockName: 'Block A' },
    { name: 'Building B1', blockName: 'Block B' },
    { name: 'Building B2', blockName: 'Block B' },
    { name: 'Building C1', blockName: 'Block C' },
    { name: 'Building C2', blockName: 'Block C' }
  ];

  const buildingIds = {};
  for (const b of buildingsData) {
    const result = await db.collection('buildings').insertOne({
      name: b.name,
      block_id: blockIds[b.blockName],
      created_at: new Date().toISOString()
    });
    buildingIds[b.name] = result.insertedId;
  }

  // Rooms
  const roomsData = [
    { room_name: 'Room 101', buildingName: 'Building A1', sensor_id: 'SEN-A1-101', capacity: 40, threshold_kwh: 50 },
    { room_name: 'Room 102', buildingName: 'Building A1', sensor_id: 'SEN-A1-102', capacity: 35, threshold_kwh: 45 },
    { room_name: 'Room 103', buildingName: 'Building A1', sensor_id: 'SEN-A1-103', capacity: 30, threshold_kwh: 40 },
    { room_name: 'Room 201', buildingName: 'Building A2', sensor_id: 'SEN-A2-201', capacity: 50, threshold_kwh: 60 },
    { room_name: 'Room 202', buildingName: 'Building A2', sensor_id: 'SEN-A2-202', capacity: 40, threshold_kwh: 50 },
    { room_name: 'Room 203', buildingName: 'Building A2', sensor_id: 'SEN-A2-203', capacity: 35, threshold_kwh: 45 },
    { room_name: 'Room 301', buildingName: 'Building B1', sensor_id: 'SEN-B1-301', capacity: 60, threshold_kwh: 70 },
    { room_name: 'Room 302', buildingName: 'Building B1', sensor_id: 'SEN-B1-302', capacity: 45, threshold_kwh: 55 },
    { room_name: 'Room 303', buildingName: 'Building B1', sensor_id: 'SEN-B1-303', capacity: 40, threshold_kwh: 50 }
  ];

  const roomIds = [];
  const roomMeta = [];
  for (const r of roomsData) {
    const result = await db.collection('rooms').insertOne({
      room_name: r.room_name,
      building_id: buildingIds[r.buildingName],
      sensor_id: r.sensor_id,
      capacity: r.capacity,
      threshold_kwh: r.threshold_kwh,
      created_at: new Date().toISOString()
    });
    roomIds.push(result.insertedId);
    roomMeta.push({ id: result.insertedId, name: r.room_name });
  }

  // Energy Data (30 days)
  const baseConsumptions = [42, 38, 35, 55, 48, 41, 65, 52, 46];
  const energyEntries = [];
  for (let day = 29; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    for (let i = 0; i < roomIds.length; i++) {
      const base = baseConsumptions[i] || 50;
      const variation = (Math.random() - 0.5) * base * 0.3;
      const weekendReduction = [0, 6].includes(date.getDay()) ? 0.6 : 1.0;
      const consumption = Math.max(5, (base + variation) * weekendReduction);

      energyEntries.push({
        room_id: roomIds[i],
        date: dateStr,
        energy_consumption_kwh: parseFloat(consumption.toFixed(2)),
        uploaded_by: 'admin@campus.edu',
        notes: day === 0 ? 'Today auto-logged' : null,
        created_at: new Date().toISOString()
      });
    }
  }
  if (energyEntries.length) {
    await db.collection('energy_data').insertMany(energyEntries);
  }

  // Alerts
  const room201Id = roomMeta.find(r => r.name === 'Room 201')?.id;

  await db.collection('alerts').insertOne({
    room_id: room201Id || null,
    message: 'Energy consumption exceeded threshold: 68 kWh (limit: 60 kWh)',
    sent_to: 'user@campus.edu',
    status: 'sent',
    alert_type: 'auto',
    created_at: new Date().toISOString()
  });

  // Campus Codes
  const codes = ['CAMPUS2024', 'ENERGY2024', 'OPTIWATT'];
  for (const code of codes) {
    await db.collection('campus_codes').updateOne(
      { _id: code },
      {
        $set: {
          code,
          created_by: 'admin@campus.edu',
          is_active: true,
          created_at: new Date().toISOString()
        }
      },
      { upsert: true }
    );
  }

  await db.collection('meta').updateOne(
    { _id: 'seeded' },
    { $set: { done: true } },
    { upsert: true }
  );
  console.log('MongoDB Seeding Complete.');
}

export async function emptyAllData() {
  const db = await getDb();
  const collections = ['users', 'blocks', 'buildings', 'rooms', 'energy_data', 'alerts', 'campus_codes', 'meta'];
  for (const name of collections) {
    await db.collection(name).deleteMany({});
  }
  console.log('All MongoDB data has been emptied.');
}
