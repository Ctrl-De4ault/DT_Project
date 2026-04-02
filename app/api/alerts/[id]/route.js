import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { ObjectId } from 'mongodb';
import { getSession } from '@/lib/auth';

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const alert = await mongoDb.collection('alerts').findOne({ _id: new ObjectId(id) });
                if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
                return NextResponse.json(alert);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET alert error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const alert = sqliteDb.prepare('SELECT id as _id, room_id, message, sent_to, status, alert_type, created_at FROM alerts WHERE id = ?').get(id);
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

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('alerts').updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            status,
                            updated_at: new Date().toISOString()
                        }
                    }
                );
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB PUT alert error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('UPDATE alerts SET status = ?, updated_at = ? WHERE id = ?')
            .run(status, new Date().toISOString(), id);

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
                await mongoDb.collection('alerts').deleteOne({ _id: new ObjectId(id) });
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB DELETE alert error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('DELETE FROM alerts WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
