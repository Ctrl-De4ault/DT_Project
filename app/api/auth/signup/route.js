import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { seedDatabase } from '@/lib/seed';

export async function POST(request) {
    try {
        const db = await getDb();

        // Ensure database is seeded if empty
        await seedDatabase();

        const { name, email, password, campus_code } = await request.json();

        if (!name || !email || !password || !campus_code) {
            return NextResponse.json({ error: 'All fields required' }, { status: 400 });
        }

        // Validate campus code
        const codeDoc = await db.collection('campus_codes').findOne({ _id: campus_code.toUpperCase() });
        if (!codeDoc || !codeDoc.is_active) {
            return NextResponse.json({ error: 'Invalid or inactive campus code' }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hash = bcrypt.hashSync(password, 10);
        const newUser = {
            _id: email.toLowerCase(),
            name,
            email: email.toLowerCase(),
            password_hash: hash,
            role: 'user',
            created_at: new Date().toISOString()
        };

        await db.collection('users').insertOne(newUser);

        const token = await signToken({
            id: email.toLowerCase(),
            email: newUser.email,
            role: newUser.role,
            name: newUser.name
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: email.toLowerCase(),
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

        response.cookies.set('auth-token', token, {
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
