import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getSession } from '@/lib/auth';

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { room_name, building_id, sensor_id, capacity, threshold_kwh } = await request.json();

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('rooms').updateOne(
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
            }
        } catch (mongoErr) {
            console.error('MongoDB PUT room error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('UPDATE rooms SET room_name = ?, building_id = ?, sensor_id = ?, capacity = ?, threshold_kwh = ?, updated_at = ? WHERE id = ?')
            .run(room_name, building_id, sensor_id || null, Number(capacity) || 30, Number(threshold_kwh) || 50, new Date().toISOString(), id);

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

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('rooms').deleteOne({ _id: new ObjectId(id) });
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB DELETE room error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('DELETE FROM rooms WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
