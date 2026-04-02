import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { seedDatabase } from '@/lib/seed';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        let user = null;
        let authMethod = 'none';

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await seedDatabase();
                user = await mongoDb.collection('users').findOne({ email: email.toLowerCase() });
                if (user && bcrypt.compareSync(password, user.password_hash)) {
                    authMethod = 'mongodb';
                } else {
                    user = null;
                }
            }
        } catch (mongoErr) {
            console.error('MongoDB auth error:', mongoErr);
        }

        // 2. Fallback to SQLite
        if (!user) {
            try {
                const sqliteDb = getSqliteDb();
                const row = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
                if (row && bcrypt.compareSync(password, row.password_hash)) {
                    user = {
                        _id: row._id || row.id,
                        email: row.email,
                        role: row.role,
                        name: row.name
                    };
                    authMethod = 'sqlite';
                }
            } catch (sqliteErr) {
                console.error('SQLite auth error:', sqliteErr);
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        console.log(`User logged in via ${authMethod}: ${user.email}`);

        const token = await signToken({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
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
        console.error('Core login error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
