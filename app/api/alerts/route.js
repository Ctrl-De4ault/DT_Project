import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET() {
    try {
        const db = await getDb();

        const alerts = await db.collection('alerts').aggregate([
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

        return NextResponse.json(alerts);
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

        const db = await getDb();
        const result = await db.collection('alerts').insertOne({
            room_id: room_id ? new ObjectId(room_id) : null,
            message,
            sent_to: sent_to || null,
            status: 'sent',
            alert_type: alert_type || 'manual',
            created_at: new Date().toISOString()
        });

        return NextResponse.json({ id: result.insertedId.toString(), success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
