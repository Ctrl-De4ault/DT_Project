import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const users = await mongoDb.collection('users')
                    .find({})
                    .project({ password_hash: 0 })
                    .sort({ created_at: -1 })
                    .toArray();
                const formattedUsers = users.map(u => ({ ...u, id: u._id }));
                return NextResponse.json(formattedUsers);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET users error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const users = sqliteDb.prepare('SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC').all();
        return NextResponse.json(users);
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

        const hash = bcrypt.hashSync(password, 10);
        const userEmail = email.toLowerCase();

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const existingUser = await mongoDb.collection('users').findOne({ _id: userEmail });
                if (existingUser) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

                const newUser = {
                    _id: userEmail,
                    name,
                    email: userEmail,
                    password_hash: hash,
                    role: role || 'user',
                    phone: phone || null,
                    created_at: new Date().toISOString()
                };
                await mongoDb.collection('users').insertOne(newUser);
                return NextResponse.json({ id: userEmail, success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB POST users error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const existingUser = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);
        if (existingUser) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

        sqliteDb.prepare('INSERT INTO users (id, email, name, password_hash, role, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(userEmail, userEmail, name, hash, role || 'user', phone || null, new Date().toISOString());

        return NextResponse.json({ id: userEmail, success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
