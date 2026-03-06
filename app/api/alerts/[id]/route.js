import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSession } from '@/lib/auth';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const db = await getDb();
        const alert = await db.collection('alerts').findOne({ _id: new ObjectId(id) });

        if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        return NextResponse.json(alert);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { status } = await request.json();
        const db = await getDb();

        await db.collection('alerts').updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status,
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
        await db.collection('alerts').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
