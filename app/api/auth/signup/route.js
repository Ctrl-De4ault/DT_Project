import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { seedDatabase } from '@/lib/seed';

export async function POST(request) {
    try {
        const { name, email, password, campus_code } = await request.json();
        if (!name || !email || !password || !campus_code) {
            return NextResponse.json({ error: 'All fields required' }, { status: 400 });
        }

        const hash = bcrypt.hashSync(password, 10);
        const userEmail = email.toLowerCase();
        let authMethod = 'none';
        let newUser = null;

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await seedDatabase();
                const codeDoc = await mongoDb.collection('campus_codes').findOne({ _id: campus_code.toUpperCase() });
                if (!codeDoc || !codeDoc.is_active) {
                    return NextResponse.json({ error: 'Invalid or inactive campus code' }, { status: 400 });
                }
                const existingUser = await mongoDb.collection('users').findOne({ email: userEmail });
                if (existingUser) {
                    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
                }
                newUser = {
                    _id: userEmail,
                    name,
                    email: userEmail,
                    password_hash: hash,
                    role: 'user',
                    created_at: new Date().toISOString()
                };
                await mongoDb.collection('users').insertOne(newUser);
                authMethod = 'mongodb';
            }
        } catch (mongoErr) {
            console.error('MongoDB signup error:', mongoErr);
        }

        // 2. Fallback to SQLite
        if (!newUser) {
            try {
                const sqliteDb = getSqliteDb();
                const codeDoc = sqliteDb.prepare('SELECT * FROM campus_codes WHERE code = ? AND is_active = 1').get(campus_code.toUpperCase());
                if (!codeDoc) {
                    return NextResponse.json({ error: 'Invalid or inactive campus code' }, { status: 400 });
                }
                const existingUser = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);
                if (existingUser) {
                    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
                }
                sqliteDb.prepare('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                    .run(userEmail, userEmail, name, hash, 'user', new Date().toISOString());
                newUser = {
                    _id: userEmail,
                    name,
                    email: userEmail,
                    role: 'user'
                };
                authMethod = 'sqlite';
            } catch (sqliteErr) {
                console.error('SQLite signup error:', sqliteErr);
            }
        }

        if (!newUser) {
            return NextResponse.json({ error: 'Signup failed. Please try again later.' }, { status: 500 });
        }

        const token = await signToken({
            id: userEmail,
            email: userEmail,
            role: newUser.role,
            name: newUser.name
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: userEmail,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                authMethod
            }
        });

        response.cookies.set('cems_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return response;
    } catch (err) {
        console.error('Signup error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
