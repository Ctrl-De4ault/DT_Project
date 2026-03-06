import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { signToken } from '@/lib/auth';

export async function POST(request) {
    try {
        const db = getDb();
        seedDatabase();

        const { name, email, password, campusCode } = await request.json();

        if (!name || !email || !password || !campusCode) {
            return NextResponse.json(
                { error: 'Name, email, password, and campus code are required' },
                { status: 400 }
            );
        }

        // Validate campus code
        const code = db.prepare(
            'SELECT * FROM campus_codes WHERE code = ? AND is_active = 1'
        ).get(campusCode.trim().toUpperCase());

        if (!code) {
            return NextResponse.json(
                { error: 'Invalid or expired campus code' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        // Create the user
        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
        ).run(name, email.toLowerCase(), hash, 'user');

        const userId = result.lastInsertRowid;

        // Generate token and auto-login
        const token = await signToken({
            id: Number(userId),
            name,
            email: email.toLowerCase(),
            role: 'user',
        });

        const response = NextResponse.json({
            success: true,
            user: { id: Number(userId), name, email: email.toLowerCase(), role: 'user' },
        });

        response.cookies.set('cems_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/',
        });

        return response;
    } catch (err) {
        console.error('Signup error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
