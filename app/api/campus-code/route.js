import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
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

        const db = await getDb();
        const codes = await db.collection('campus_codes').aggregate([
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

        const db = await getDb();
        const code = generateCode();
        await db.collection('campus_codes').insertOne({
            _id: code,
            code,
            created_by: session.id || session.email,
            is_active: 1,
            created_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true, code });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
