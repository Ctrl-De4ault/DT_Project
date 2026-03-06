import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request, { params }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const { id } = await params;
        const { name, email, role, phone, password } = await request.json();
        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET name=?, email=?, role=?, phone=?, password_hash=? WHERE id=?').run(name, email, role, phone, hash, id);
        } else {
            db.prepare('UPDATE users SET name=?, email=?, role=?, phone=? WHERE id=?').run(name, email, role, phone, id);
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
        const db = getDb();
        const { id } = await params;
        if (parseInt(id) === session.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
