import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('room_id');
        const blockId = searchParams.get('block_id');
        const buildingId = searchParams.get('building_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const limit = searchParams.get('limit') || 500;

        let query = `
      SELECT ed.*, r.room_name, r.sensor_id, r.threshold_kwh,
        bld.name as building_name, blk.name as block_name, blk.id as block_id,
        u.name as uploaded_by_name
      FROM energy_data ed
      JOIN rooms r ON r.id = ed.room_id
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
      LEFT JOIN users u ON u.id = ed.uploaded_by
    `;
        const conditions = [];
        const args = [];

        if (roomId) { conditions.push('ed.room_id = ?'); args.push(roomId); }
        if (buildingId) { conditions.push('bld.id = ?'); args.push(buildingId); }
        if (blockId) { conditions.push('blk.id = ?'); args.push(blockId); }
        if (startDate) { conditions.push('ed.date >= ?'); args.push(startDate); }
        if (endDate) { conditions.push('ed.date <= ?'); args.push(endDate); }

        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY ed.date DESC, r.room_name LIMIT ?';
        args.push(parseInt(limit));

        const data = db.prepare(query).all(...args);
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const db = getDb();
        const body = await request.json();

        // Handle array (bulk) or single entry
        const entries = Array.isArray(body) ? body : [body];

        const insert = db.prepare(
            'INSERT INTO energy_data (room_id, date, energy_consumption_kwh, uploaded_by, notes) VALUES (?, ?, ?, ?, ?)'
        );

        const insertMany = db.transaction((rows) => {
            const results = [];
            for (const row of rows) {
                const { room_id, date, energy_consumption_kwh, notes } = row;
                if (!room_id || !date || energy_consumption_kwh == null) continue;
                const r = insert.run(room_id, date, energy_consumption_kwh, session.id, notes || null);
                results.push(r.lastInsertRowid);
            }
            return results;
        });

        const ids = insertMany(entries);
        return NextResponse.json({ success: true, inserted: ids.length, ids });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        db.prepare('DELETE FROM energy_data WHERE id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
