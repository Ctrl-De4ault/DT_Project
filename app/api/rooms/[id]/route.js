import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const { id } = await params;
        const { room_name, building_id, sensor_id, capacity, threshold_kwh } = await request.json();
        db.prepare('UPDATE rooms SET room_name=?, building_id=?, sensor_id=?, capacity=?, threshold_kwh=? WHERE id=?')
            .run(room_name, building_id, sensor_id, capacity, threshold_kwh, id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const { id } = await params;
        db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
