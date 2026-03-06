import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const blockId = searchParams.get('block_id');
        let buildings;
        if (blockId) {
            buildings = db.prepare(`
        SELECT bld.*, blk.name as block_name, COUNT(r.id) as room_count
        FROM buildings bld
        JOIN blocks blk ON blk.id = bld.block_id
        LEFT JOIN rooms r ON r.building_id = bld.id
        WHERE bld.block_id = ?
        GROUP BY bld.id ORDER BY bld.name
      `).all(blockId);
        } else {
            buildings = db.prepare(`
        SELECT bld.*, blk.name as block_name, COUNT(r.id) as room_count
        FROM buildings bld
        JOIN blocks blk ON blk.id = bld.block_id
        LEFT JOIN rooms r ON r.building_id = bld.id
        GROUP BY bld.id ORDER BY blk.name, bld.name
      `).all();
        }
        return NextResponse.json(buildings);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const { name, block_id } = await request.json();
        if (!name || !block_id) return NextResponse.json({ error: 'Name and block_id required' }, { status: 400 });
        const result = db.prepare('INSERT INTO buildings (name, block_id) VALUES (?, ?)').run(name, block_id);
        return NextResponse.json({ id: result.lastInsertRowid, name, block_id });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
