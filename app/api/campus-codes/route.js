import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
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

        // Standardize output to match expected frontend structure
        const formattedCodes = codes.map(c => ({ ...c, id: c._id }));

        return NextResponse.json({ codes: formattedCodes });
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

        const db = await getDb();
        const codeUpper = code.trim().toUpperCase();

        const existing = await db.collection('campus_codes').findOne({ _id: codeUpper });
        if (existing) {
            return NextResponse.json(
                { error: 'This campus code already exists' },
                { status: 409 }
            );
        }

        await db.collection('campus_codes').insertOne({
            _id: codeUpper,
            code: codeUpper,
            created_by: session.id || session.email,
            is_active: 1,
            created_at: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            code: {
                id: codeUpper,
                code: codeUpper,
                created_by: session.id || session.email,
                is_active: 1
            }
        });
    } catch (error) {
        console.error('Error creating campus code:', error);
        return NextResponse.json({ error: 'Failed to create campus code' }, { status: 500 });
    }
}
