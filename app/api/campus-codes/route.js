import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
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
                const formattedCodes = codes.map(c => ({ ...c, id: c._id }));
                return NextResponse.json({ codes: formattedCodes });
            }
        } catch (mongoErr) {
            console.error('MongoDB GET campus-codes error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const codes = sqliteDb.prepare(`
            SELECT 
                c.code as id, 
                c.code, 
                c.created_by, 
                c.is_active, 
                c.created_at,
                COALESCE(u.name, c.created_by) as created_by_name
            FROM campus_codes c
            LEFT JOIN users u ON c.created_by = u.id
            ORDER BY c.created_at DESC
        `).all();
        return NextResponse.json({ codes });
    } catch (error) {
        console.error('Error fetching campus codes:', error);
        return NextResponse.json({ error: 'Failed to fetch campus codes' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { code } = await request.json();
        if (!code || code.trim().length < 4) {
            return NextResponse.json(
                { error: 'Campus code must be at least 4 characters long' },
                { status: 400 }
            );
        }

        const codeUpper = code.trim().toUpperCase();
        const createdBy = session.id || session.email;

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const existing = await mongoDb.collection('campus_codes').findOne({ _id: codeUpper });
                if (existing) {
                    return NextResponse.json({ error: 'This campus code already exists' }, { status: 409 });
                }
                await mongoDb.collection('campus_codes').insertOne({
                    _id: codeUpper,
                    code: codeUpper,
                    created_by: createdBy,
                    is_active: 1,
                    created_at: new Date().toISOString()
                });
                return NextResponse.json({
                    success: true,
                    code: { id: codeUpper, code: codeUpper, created_by: createdBy, is_active: 1 }
                });
            }
        } catch (mongoErr) {
            console.error('MongoDB POST campus-codes error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        const existing = sqliteDb.prepare('SELECT * FROM campus_codes WHERE code = ?').get(codeUpper);
        if (existing) {
            return NextResponse.json({ error: 'This campus code already exists' }, { status: 409 });
        }
        sqliteDb.prepare('INSERT INTO campus_codes (code, created_by, is_active, created_at) VALUES (?, ?, ?, ?)')
            .run(codeUpper, createdBy, 1, new Date().toISOString());

        return NextResponse.json({
            success: true,
            code: { id: codeUpper, code: codeUpper, created_by: createdBy, is_active: 1 }
        });
    } catch (error) {
        console.error('Error creating campus code:', error);
        return NextResponse.json({ error: 'Failed to create campus code' }, { status: 500 });
    }
}
