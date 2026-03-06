import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const codes = db.prepare(`
            SELECT cc.*, u.name as created_by_name 
            FROM campus_codes cc 
            LEFT JOIN users u ON cc.created_by = u.id 
            ORDER BY cc.created_at DESC
        `).all();
        
        return NextResponse.json({ codes });
    } catch (error) {
        console.error('Error fetching campus codes:', error);
        return NextResponse.json({ error: 'Failed to fetch campus codes' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { code } = await request.json();
        
        if (!code || code.trim().length < 4) {
            return NextResponse.json(
                { error: 'Campus code must be at least 4 characters long' },
                { status: 400 }
            );
        }
        
        // Check if code already exists
        const existing = db.prepare('SELECT id FROM campus_codes WHERE code = ?').get(code.trim().toUpperCase());
        if (existing) {
            return NextResponse.json(
                { error: 'This campus code already exists' },
                { status: 409 }
            );
        }
        
        // Get current user (this would need auth middleware in production)
        // For now, we'll assume admin user ID 1
        const result = db.prepare(`
            INSERT INTO campus_codes (code, created_by, is_active) 
            VALUES (?, 1, 1)
        `).run(code.trim().toUpperCase());
        
        return NextResponse.json({
            success: true,
            code: {
                id: result.lastInsertRowid,
                code: code.trim().toUpperCase(),
                created_by: 1,
                is_active: 1
            }
        });
    } catch (error) {
        console.error('Error creating campus code:', error);
        return NextResponse.json({ error: 'Failed to create campus code' }, { status: 500 });
    }
}
