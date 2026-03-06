import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSession } from '@/lib/auth';

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'OW-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const db = getDb();
        const codes = db.prepare(
            `SELECT cc.*, u.name as created_by_name 
             FROM campus_codes cc 
             LEFT JOIN users u ON cc.created_by = u.id 
             ORDER BY cc.created_at DESC`
        ).all();
        return NextResponse.json(codes);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const db = getDb();
        const code = generateCode();
        db.prepare(
            'INSERT INTO campus_codes (code, created_by) VALUES (?, ?)'
        ).run(code, session.id);
        return NextResponse.json({ success: true, code });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
