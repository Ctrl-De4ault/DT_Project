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
                const rooms = await mongoDb.collection('rooms').aggregate([
                    {
                        $lookup: {
                            from: 'buildings',
                            localField: 'building_id',
                            foreignField: '_id',
                            as: 'building'
                        }
                    },
                    {
                        $unwind: { path: '$building', preserveNullAndEmptyArrays: true }
                    },
                    {
                        $lookup: {
                            from: 'blocks',
                            localField: 'building.block_id',
                            foreignField: '_id',
                            as: 'block'
                        }
                    },
                    {
                        $unwind: { path: '$block', preserveNullAndEmptyArrays: true }
                    },
                    {
                        $project: {
                            room_name: 1,
                            building_id: 1,
                            sensor_id: 1,
                            capacity: 1,
                            threshold_kwh: 1,
                            created_at: 1,
                            building_name: '$building.name',
                            block_name: '$block.name'
                        }
                    },
                    { $sort: { created_at: -1 } }
                ]).toArray();
                const formatted = rooms.map(r => ({ ...r, id: r._id?.toString() || r._id }));
                return NextResponse.json(formatted);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET rooms error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const rooms = sqliteDb.prepare(`
            SELECT 
                r.id as _id, 
                r.room_name, 
                r.building_id, 
                r.sensor_id, 
                r.capacity, 
                r.threshold_kwh, 
                r.created_at,
                bu.name as building_name,
                bl.name as block_name
            FROM rooms r
            LEFT JOIN buildings bu ON r.building_id = bu.id
            LEFT JOIN blocks bl ON bu.block_id = bl.id
            ORDER BY r.created_at DESC
        `).all();
        const formatted = rooms.map(r => ({ ...r, id: r._id }));
        return NextResponse.json(formatted);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { room_name, building_id, sensor_id, capacity, threshold_kwh } = await request.json();
        if (!room_name || !building_id) {
            return NextResponse.json({ error: 'Room name and building required' }, { status: 400 });
        }

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const result = await mongoDb.collection('rooms').insertOne({
                    room_name,
                    building_id: new ObjectId(building_id),
                    sensor_id: sensor_id || null,
                    capacity: Number(capacity) || 30,
                    threshold_kwh: Number(threshold_kwh) || 50,
                    created_at: new Date().toISOString()
                });
                return NextResponse.json({
                    success: true,
                    id: result.insertedId.toString()
                });
            }
        } catch (mongoErr) {
            console.error('MongoDB POST rooms error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const result = sqliteDb.prepare('INSERT INTO rooms (room_name, building_id, sensor_id, capacity, threshold_kwh, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(room_name, building_id, sensor_id || null, Number(capacity) || 30, Number(threshold_kwh) || 50, new Date().toISOString());

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid.toString()
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
