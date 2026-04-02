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
        const { name, block_id } = await request.json();

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('buildings').updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            name,
                            block_id: new ObjectId(block_id),
                            updated_at: new Date().toISOString()
                        }
                    }
                );
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB PUT building error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('UPDATE buildings SET name = ?, block_id = ?, updated_at = ? WHERE id = ?')
            .run(name, block_id, new Date().toISOString(), id);

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
                await mongoDb.collection('buildings').deleteOne({ _id: new ObjectId(id) });
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB DELETE building error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('DELETE FROM buildings WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
