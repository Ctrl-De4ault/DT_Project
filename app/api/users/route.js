import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const users = db.prepare('SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC').all();
        return NextResponse.json(users);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const db = getDb();
        const { name, email, password, role, phone } = await request.json();
        if (!name || !email || !password) return NextResponse.json({ error: 'Name, email, password required' }, { status: 400 });
        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)').run(name, email, hash, role || 'user', phone || null);
        return NextResponse.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
