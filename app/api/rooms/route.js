import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const buildingId = searchParams.get('building_id');
        const blockId = searchParams.get('block_id');

        let query = `
      SELECT r.*, bld.name as building_name, blk.name as block_name, blk.id as block_id
      FROM rooms r
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
    `;
        const conditions = [];
        const args = [];

        if (buildingId) { conditions.push('r.building_id = ?'); args.push(buildingId); }
        if (blockId) { conditions.push('blk.id = ?'); args.push(blockId); }
        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY blk.name, bld.name, r.room_name';

        const rooms = db.prepare(query).all(...args);
        return NextResponse.json(rooms);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const { room_name, building_id, sensor_id, capacity, threshold_kwh } = await request.json();
        if (!room_name || !building_id) return NextResponse.json({ error: 'Room name and building required' }, { status: 400 });
        const result = db.prepare(
            'INSERT INTO rooms (room_name, building_id, sensor_id, capacity, threshold_kwh) VALUES (?, ?, ?, ?, ?)'
        ).run(room_name, building_id, sensor_id || null, capacity || 30, threshold_kwh || 50);
        return NextResponse.json({ id: result.lastInsertRowid });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
