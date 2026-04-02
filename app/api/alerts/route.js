import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET() {
    try {
        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const alerts = await mongoDb.collection('alerts').aggregate([
                    {
                        $lookup: {
                            from: 'rooms',
                            localField: 'room_id',
                            foreignField: '_id',
                            as: 'room'
                        }
                    },
                    { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: 'buildings',
                            localField: 'room.building_id',
                            foreignField: '_id',
                            as: 'building'
                        }
                    },
                    { $unwind: { path: '$building', preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: 'blocks',
                            localField: 'building.block_id',
                            foreignField: '_id',
                            as: 'block'
                        }
                    },
                    { $unwind: { path: '$block', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            room_id: 1,
                            message: 1,
                            sent_to: 1,
                            status: 1,
                            alert_type: 1,
                            created_at: 1,
                            room_name: { $ifNull: ['$room.room_name', 'General'] },
                            building_name: { $ifNull: ['$building.name', ''] },
                            block_name: { $ifNull: ['$block.name', ''] }
                        }
                    },
                    { $sort: { created_at: -1 } }
                ]).toArray();
                const formatted = alerts.map(a => ({ ...a, id: a._id?.toString() || a._id }));
                return NextResponse.json(formatted);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET alerts error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const alerts = sqliteDb.prepare(`
            SELECT 
                a.id as _id,
                a.room_id,
                a.message,
                a.sent_to,
                a.status,
                a.alert_type,
                a.created_at,
                COALESCE(r.room_name, 'General') as room_name,
                COALESCE(bu.name, '') as building_name,
                COALESCE(bl.name, '') as block_name
            FROM alerts a
            LEFT JOIN rooms r ON a.room_id = r.id
            LEFT JOIN buildings bu ON r.building_id = bu.id
            LEFT JOIN blocks bl ON bu.block_id = bl.id
            ORDER BY a.created_at DESC
        `).all();
        const formatted = alerts.map(a => ({ ...a, id: a._id }));
        return NextResponse.json(formatted);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { room_id, message, sent_to, alert_type } = await request.json();
        if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const result = await mongoDb.collection('alerts').insertOne({
                    room_id: room_id ? new ObjectId(room_id) : null,
                    message,
                    sent_to: sent_to || null,
                    status: 'sent',
                    alert_type: alert_type || 'manual',
                    created_at: new Date().toISOString()
                });
                return NextResponse.json({ id: result.insertedId.toString(), success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB POST alerts error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const result = sqliteDb.prepare('INSERT INTO alerts (room_id, message, sent_to, status, alert_type, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(room_id || null, message, sent_to || null, 'sent', alert_type || 'manual', new Date().toISOString());

        return NextResponse.json({ id: result.lastInsertRowid.toString(), success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
