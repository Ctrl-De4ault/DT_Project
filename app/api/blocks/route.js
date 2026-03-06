import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const db = getDb();
        const blocks = db.prepare(`
      SELECT b.*, 
        COUNT(DISTINCT bld.id) as building_count,
        COUNT(DISTINCT r.id) as room_count
      FROM blocks b
      LEFT JOIN buildings bld ON bld.block_id = b.id
      LEFT JOIN rooms r ON r.building_id = bld.id
      GROUP BY b.id
      ORDER BY b.name
    `).all();
        return NextResponse.json(blocks);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const db = getDb();
        const { name, description } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
        const result = db.prepare('INSERT INTO blocks (name, description) VALUES (?, ?)').run(name, description || null);
        return NextResponse.json({ id: result.lastInsertRowid, name, description });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
