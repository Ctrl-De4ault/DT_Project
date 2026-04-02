import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
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

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const codes = await mongoDb.collection('campus_codes').aggregate([
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'created_by',
                            foreignField: '_id',
                            as: 'creator'
                        }
                    },
                    { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            code: 1,
                            created_by: 1,
                            is_active: 1,
                            created_at: 1,
                            created_by_name: { $ifNull: ['$creator.name', '$created_by'] }
                        }
                    },
                    { $sort: { created_at: -1 } }
                ]).toArray();
                return NextResponse.json(codes);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET campus-code error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const codes = sqliteDb.prepare(`
            SELECT 
                c.code as _id,
                c.code,
                c.created_by,
                c.is_active,
                c.created_at,
                COALESCE(u.name, c.created_by) as created_by_name
            FROM campus_codes c
            LEFT JOIN users u ON c.created_by = u.id
            ORDER BY c.created_at DESC
        `).all();
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

        const code = generateCode();
        const createdBy = session.id || session.email;

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('campus_codes').insertOne({
                    _id: code,
                    code,
                    created_by: createdBy,
                    is_active: 1,
                    created_at: new Date().toISOString()
                });
                return NextResponse.json({ success: true, code });
            }
        } catch (mongoErr) {
            console.error('MongoDB POST campus-code error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('INSERT INTO campus_codes (code, created_by, is_active, created_at) VALUES (?, ?, ?, ?)')
            .run(code, createdBy, 1, new Date().toISOString());

        return NextResponse.json({ success: true, code });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
