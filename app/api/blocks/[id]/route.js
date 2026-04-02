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
        const { name, description } = await request.json();

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('blocks').updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            name,
                            description: description || null,
                            updated_at: new Date().toISOString()
                        }
                    }
                );
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB PUT block error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('UPDATE blocks SET name = ?, description = ?, updated_at = ? WHERE id = ?')
            .run(name, description || null, new Date().toISOString(), id);

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
                await mongoDb.collection('blocks').deleteOne({ _id: new ObjectId(id) });
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB DELETE block error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('DELETE FROM blocks WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
