import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { seedDatabase } from '@/lib/seed';

export async function POST(request) {
    try {
        const db = await getDb();

        // Auto-seed on first login if empty
        await seedDatabase();

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const user = await db.collection('users').findOne({ email: email.toLowerCase() });

        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

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
                role: user.role
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
        console.error('Login error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
