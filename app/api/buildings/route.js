import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
    try {
        const db = await getDb();

        const buildings = await db.collection('buildings').aggregate([
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

        return NextResponse.json(buildings);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = await getDb();
        const { name, block_id } = await request.json();

        if (!name || !block_id) {
            return NextResponse.json({ error: 'Name and block required' }, { status: 400 });
        }

        const result = await db.collection('buildings').insertOne({
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
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
