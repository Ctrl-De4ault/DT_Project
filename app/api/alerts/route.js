import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const db = getDb();
        const alerts = db.prepare(`
      SELECT a.*, r.room_name, bld.name as building_name, blk.name as block_name
      FROM alerts a
      LEFT JOIN rooms r ON r.id = a.room_id
      LEFT JOIN buildings bld ON bld.id = r.building_id
      LEFT JOIN blocks blk ON blk.id = bld.block_id
      ORDER BY a.created_at DESC
    `).all();
        return NextResponse.json(alerts);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const db = getDb();
        const { room_id, message, sent_to, alert_type } = await request.json();
        if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });
        const result = db.prepare(
            'INSERT INTO alerts (room_id, message, sent_to, status, alert_type) VALUES (?, ?, ?, ?, ?)'
        ).run(room_id || null, message, sent_to || null, 'sent', alert_type || 'manual');
        return NextResponse.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
