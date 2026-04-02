import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';

export async function GET() {
    try {
        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const blocks = await mongoDb.collection('blocks').aggregate([
                    {
                        $lookup: {
                            from: 'buildings',
                            localField: '_id',
                            foreignField: 'block_id',
                            as: 'buildings'
                        }
                    },
                    {
                        $lookup: {
                            from: 'rooms',
                            localField: 'buildings._id',
                            foreignField: 'building_id',
                            as: 'rooms'
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            description: 1,
                            created_at: 1,
                            building_count: { $size: '$buildings' },
                            room_count: { $size: '$rooms' }
                        }
                    },
                    { $sort: { created_at: -1 } }
                ]).toArray();
                const formatted = blocks.map(b => ({ ...b, id: b._id?.toString() || b._id }));
                return NextResponse.json(formatted);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET blocks error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const blocks = sqliteDb.prepare(`
            SELECT 
                b.id as _id, 
                b.name, 
                b.description, 
                b.created_at,
                (SELECT COUNT(*) FROM buildings WHERE block_id = b.id) as building_count,
                (SELECT COUNT(*) FROM rooms WHERE building_id IN (SELECT id FROM buildings WHERE block_id = b.id)) as room_count
            FROM blocks b
            ORDER BY created_at DESC
        `).all();
        const formatted = blocks.map(b => ({ ...b, id: b._id }));
        return NextResponse.json(formatted);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name, description } = await request.json();
        if (!name) {
            return NextResponse.json({ error: 'Block name required' }, { status: 400 });
        }

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const result = await mongoDb.collection('blocks').insertOne({
                    name,
                    description: description || null,
                    created_at: new Date().toISOString()
                });
                return NextResponse.json({
                    success: true,
                    id: result.insertedId.toString(),
                    name,
                    description
                });
            }
        } catch (mongoErr) {
            console.error('MongoDB POST blocks error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const result = sqliteDb.prepare('INSERT INTO blocks (name, description, created_at) VALUES (?, ?, ?)')
            .run(name, description || null, new Date().toISOString());

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid.toString(),
            name,
            description
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
