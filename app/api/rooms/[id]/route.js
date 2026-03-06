import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSession } from '@/lib/auth';

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { room_name, building_id, sensor_id, capacity, threshold_kwh } = await request.json();
        const db = await getDb();

        await db.collection('rooms').updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    room_name,
                    building_id: new ObjectId(building_id),
                    sensor_id: sensor_id || null,
                    capacity: Number(capacity) || 30,
                    threshold_kwh: Number(threshold_kwh) || 50,
                    updated_at: new Date().toISOString()
                }
            }
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const db = await getDb();
        await db.collection('rooms').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
