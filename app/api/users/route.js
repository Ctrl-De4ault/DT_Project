import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const db = await getDb();
        const users = await db.collection('users')
            .find({})
            .project({ password_hash: 0 })
            .sort({ created_at: -1 })
            .toArray();

        // Map _id to id for frontend compatibility
        const formattedUsers = users.map(u => ({ ...u, id: u._id }));

        return NextResponse.json(formattedUsers);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { name, email, password, role, phone } = await request.json();
        if (!name || !email || !password) return NextResponse.json({ error: 'Name, email, password required' }, { status: 400 });

        const db = await getDb();
        const existingUser = await db.collection('users').findOne({ _id: email.toLowerCase() });
        if (existingUser) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

        const hash = bcrypt.hashSync(password, 10);
        const newUser = {
            _id: email.toLowerCase(),
            name,
            email: email.toLowerCase(),
            password_hash: hash,
            role: role || 'user',
            phone: phone || null,
            created_at: new Date().toISOString()
        };

        await db.collection('users').insertOne(newUser);

        return NextResponse.json({ id: email.toLowerCase(), success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
