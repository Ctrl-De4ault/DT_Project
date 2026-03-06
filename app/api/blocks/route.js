import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
    try {
        const db = await getDb();

        const blocks = await db.collection('blocks').aggregate([
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

        return NextResponse.json(blocks);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = await getDb();
        const { name, description } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Block name required' }, { status: 400 });
        }

        const result = await db.collection('blocks').insertOne({
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
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
