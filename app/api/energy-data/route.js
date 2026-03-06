import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('room_id');
        const buildingId = searchParams.get('building_id');
        const blockId = searchParams.get('block_id');
        const search = searchParams.get('search');

        // Build aggregation pipeline
        const pipeline = [
            {
                $lookup: {
                    from: 'rooms',
                    localField: 'room_id',
                    foreignField: '_id',
                    as: 'room'
                }
            },
            { $unwind: '$room' },
            {
                $lookup: {
                    from: 'buildings',
                    localField: 'room.building_id',
                    foreignField: '_id',
                    as: 'building'
                }
            },
            { $unwind: '$building' },
            {
                $lookup: {
                    from: 'blocks',
                    localField: 'building.block_id',
                    foreignField: '_id',
                    as: 'block'
                }
            },
            { $unwind: '$block' }
        ];

        // Apply filters
        const match = {};
        if (roomId) match.room_id = new ObjectId(roomId);
        if (buildingId) match['room.building_id'] = new ObjectId(buildingId);
        if (blockId) match['building.block_id'] = new ObjectId(blockId);
        if (search) {
            match.$or = [
                { 'room.room_name': { $regex: search, $options: 'i' } },
                { 'building.name': { $regex: search, $options: 'i' } },
                { 'block.name': { $regex: search, $options: 'i' } }
            ];
        }

        if (Object.keys(match).length > 0) {
            pipeline.push({ $match: match });
        }

        pipeline.push(
            {
                $project: {
                    date: 1,
                    energy_consumption_kwh: 1,
                    room_id: 1,
                    room_name: '$room.room_name',
                    building_id: '$room.building_id',
                    building_name: '$building.name',
                    block_id: '$building.block_id',
                    block_name: '$block.name'
                }
            },
            { $sort: { date: -1, created_at: -1 } },
            { $limit: 100 }
        );

        const data = await db.collection('energy_data').aggregate(pipeline).toArray();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = await getDb();
        const data = await request.json();

        if (Array.isArray(data)) {
            const entries = data.map(entry => ({
                ...entry,
                room_id: new ObjectId(entry.room_id),
                energy_consumption_kwh: parseFloat(entry.energy_consumption_kwh),
                created_at: new Date().toISOString()
            }));

            if (entries.length > 0) {
                await db.collection('energy_data').insertMany(entries);
            }
            return NextResponse.json({ success: true, count: entries.length });
        } else {
            const entry = {
                ...data,
                room_id: new ObjectId(data.room_id),
                energy_consumption_kwh: parseFloat(data.energy_consumption_kwh),
                created_at: new Date().toISOString()
            };
            const result = await db.collection('energy_data').insertOne(entry);
            return NextResponse.json({ success: true, id: result.insertedId.toString() });
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
