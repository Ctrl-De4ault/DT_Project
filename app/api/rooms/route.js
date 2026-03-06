import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
    try {
        const db = await getDb();

        const rooms = await db.collection('rooms').aggregate([
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

        return NextResponse.json(rooms);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = await getDb();
        const { room_name, building_id, sensor_id, capacity, threshold_kwh } = await request.json();

        if (!room_name || !building_id) {
            return NextResponse.json({ error: 'Room name and building required' }, { status: 400 });
        }

        const result = await db.collection('rooms').insertOne({
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
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
