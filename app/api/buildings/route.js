import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET() {
    try {
        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const buildings = await mongoDb.collection('buildings').aggregate([
                    {
                        $lookup: {
                            from: 'blocks',
                            localField: 'block_id',
                            foreignField: '_id',
                            as: 'block'
                        }
                    },
                    {
                        $lookup: {
                            from: 'rooms',
                            localField: '_id',
                            foreignField: 'building_id',
                            as: 'rooms'
                        }
                    },
                    {
                        $unwind: { path: '$block', preserveNullAndEmptyArrays: true }
                    },
                    {
                        $project: {
                            name: 1,
                            block_id: 1,
                            created_at: 1,
                            block_name: '$block.name',
                            room_count: { $size: '$rooms' }
                        }
                    },
                    { $sort: { created_at: -1 } }
                ]).toArray();
                const formatted = buildings.map(b => ({ ...b, id: b._id?.toString() || b._id }));
                return NextResponse.json(formatted);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET buildings error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const buildings = sqliteDb.prepare(`
            SELECT 
                bu.id as _id, 
                bu.name, 
                bu.block_id, 
                bu.created_at,
                bl.name as block_name,
                (SELECT COUNT(*) FROM rooms WHERE building_id = bu.id) as room_count
            FROM buildings bu
            LEFT JOIN blocks bl ON bu.block_id = bl.id
            ORDER BY bu.created_at DESC
        `).all();
        const formatted = buildings.map(b => ({ ...b, id: b._id }));
        return NextResponse.json(formatted);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name, block_id } = await request.json();
        if (!name || !block_id) {
            return NextResponse.json({ error: 'Name and block required' }, { status: 400 });
        }

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const result = await mongoDb.collection('buildings').insertOne({
                    name,
                    block_id: new ObjectId(block_id),
                    created_at: new Date().toISOString()
                });
                return NextResponse.json({
                    success: true,
                    id: result.insertedId.toString(),
                    name,
                    block_id
                });
            }
        } catch (mongoErr) {
            console.error('MongoDB POST buildings error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const result = sqliteDb.prepare('INSERT INTO buildings (name, block_id, created_at) VALUES (?, ?, ?)')
            .run(name, block_id, new Date().toISOString());

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid.toString(),
            name,
            block_id
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
