import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { id } = await params;
        const { name, email, role, phone, password } = await request.json();
        const db = await getDb();

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

        // id is email (string)
        await db.collection('users').updateOne(
            { _id: id },
            { $set: updateData }
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
        if (id === session.id || id === session.email) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

        const db = await getDb();
        await db.collection('users').deleteOne({ _id: id });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
