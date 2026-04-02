import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { name, email, role, phone, password } = await request.json();

        const updateData = {
            name,
            email: email.toLowerCase(),
            role,
            phone,
            updated_at: new Date().toISOString()
        };

        if (password) {
            updateData.password_hash = bcrypt.hashSync(password, 10);
        }

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('users').updateOne(
                    { _id: id },
                    { $set: updateData }
                );
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB PUT user error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        if (password) {
            sqliteDb.prepare('UPDATE users SET name = ?, email = ?, role = ?, phone = ?, password_hash = ?, updated_at = ? WHERE id = ?')
                .run(name, email.toLowerCase(), role, phone, updateData.password_hash, new Date().toISOString(), id);
        } else {
            sqliteDb.prepare('UPDATE users SET name = ?, email = ?, role = ?, phone = ?, updated_at = ? WHERE id = ?')
                .run(name, email.toLowerCase(), role, phone, new Date().toISOString(), id);
        }

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
        if (id === session.id || id === session.email) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('users').deleteOne({ _id: id });
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB DELETE user error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
