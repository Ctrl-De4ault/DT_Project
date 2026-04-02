import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('room_id');
        const buildingId = searchParams.get('building_id');
        const blockId = searchParams.get('block_id');
        const search = searchParams.get('search');

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const pipeline = [
                    {
                        $lookup: {
                            from: 'rooms',
                            localField: 'room_id',
                            foreignField: '_id',
                            as: 'room'
                        }
                    },
                    { $unwind: '$room' },
                    {
                        $lookup: {
                            from: 'buildings',
                            localField: 'room.building_id',
                            foreignField: '_id',
                            as: 'building'
                        }
                    },
                    { $unwind: '$building' },
                    {
                        $lookup: {
                            from: 'blocks',
                            localField: 'building.block_id',
                            foreignField: '_id',
                            as: 'block'
                        }
                    },
                    { $unwind: '$block' }
                ];

                const match = {};
                if (roomId) match.room_id = new ObjectId(roomId);
                if (buildingId) match['room.building_id'] = new ObjectId(buildingId);
                if (blockId) match['building.block_id'] = new ObjectId(blockId);
                if (search) {
                    match.$or = [
                        { 'room.room_name': { $regex: search, $options: 'i' } },
                        { 'building.name': { $regex: search, $options: 'i' } },
                        { 'block.name': { $regex: search, $options: 'i' } }
                    ];
                }

                if (Object.keys(match).length > 0) {
                    pipeline.push({ $match: match });
                }

                pipeline.push(
                    {
                        $project: {
                            date: 1,
                            energy_consumption_kwh: 1,
                            room_id: 1,
                            room_name: '$room.room_name',
                            building_id: '$room.building_id',
                            building_name: '$building.name',
                            block_id: '$building.block_id',
                            block_name: '$block.name'
                        }
                    },
                    { $sort: { date: -1, created_at: -1 } },
                    { $limit: 100 }
                );

                const data = await mongoDb.collection('energy_data').aggregate(pipeline).toArray();
                const formatted = data.map(d => ({ ...d, id: d._id?.toString() || d._id }));
                return NextResponse.json(formatted);
            }
        } catch (mongoErr) {
            console.error('MongoDB GET energy-data error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        let query = `
            SELECT 
                e.id as _id,
                e.date,
                e.energy_consumption_kwh,
                e.room_id,
                r.room_name,
                r.building_id,
                bu.name as building_name,
                bu.block_id,
                bl.name as block_name
            FROM energy_data e
            JOIN rooms r ON e.room_id = r.id
            JOIN buildings bu ON r.building_id = bu.id
            JOIN blocks bl ON bu.block_id = bl.id
            WHERE 1=1
        `;
        const params = [];

        if (roomId) {
            query += " AND e.room_id = ?";
            params.push(roomId);
        }
        if (buildingId) {
            query += " AND r.building_id = ?";
            params.push(buildingId);
        }
        if (blockId) {
            query += " AND bu.block_id = ?";
            params.push(blockId);
        }
        if (search) {
            query += " AND (r.room_name LIKE ? OR bu.name LIKE ? OR bl.name LIKE ?)";
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        query += " ORDER BY e.date DESC, e.created_at DESC LIMIT 100";
        const data = sqliteDb.prepare(query).all(...params);
        const formatted = data.map(d => ({ ...d, id: d._id }));
        return NextResponse.json(formatted);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                if (Array.isArray(body)) {
                    // Check for duplicates in bulk
                    const duplicates = [];
                    for (const entry of body) {
                        const existing = await mongoDb.collection('energy_data').findOne({
                            room_id: new ObjectId(entry.room_id),
                            date: entry.date
                        });
                        if (existing) duplicates.push(`${entry.room_id} on ${entry.date}`);
                    }
                    if (duplicates.length > 0) {
                        return NextResponse.json({
                            error: `Energy log already exists for: ${duplicates.join(', ')}. Only one entry per room per day is allowed.`
                        }, { status: 409 });
                    }

                    const entries = body.map(entry => ({
                        ...entry,
                        room_id: new ObjectId(entry.room_id),
                        energy_consumption_kwh: parseFloat(entry.energy_consumption_kwh),
                        created_at: new Date().toISOString()
                    }));
                    if (entries.length > 0) {
                        await mongoDb.collection('energy_data').insertMany(entries);
                    }
                    return NextResponse.json({ success: true, count: entries.length });
                } else {
                    // Check duplicate for single entry
                    const existing = await mongoDb.collection('energy_data').findOne({
                        room_id: new ObjectId(body.room_id),
                        date: body.date
                    });
                    if (existing) {
                        return NextResponse.json({
                            error: 'Energy log already exists for this room on this date. Only one entry per room per day is allowed.'
                        }, { status: 409 });
                    }

                    const entry = {
                        ...body,
                        room_id: new ObjectId(body.room_id),
                        energy_consumption_kwh: parseFloat(body.energy_consumption_kwh),
                        created_at: new Date().toISOString()
                    };
                    const result = await mongoDb.collection('energy_data').insertOne(entry);
                    return NextResponse.json({ success: true, id: result.insertedId.toString() });
                }
            }
        } catch (mongoErr) {
            console.error('MongoDB POST energy-data error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        if (Array.isArray(body)) {
            // Check for duplicates in bulk
            const checkStmt = sqliteDb.prepare('SELECT id FROM energy_data WHERE room_id = ? AND date = ?');
            const duplicates = [];
            for (const entry of body) {
                const existing = checkStmt.get(entry.room_id, entry.date);
                if (existing) duplicates.push(`room ${entry.room_id} on ${entry.date}`);
            }
            if (duplicates.length > 0) {
                return NextResponse.json({
                    error: `Energy log already exists for: ${duplicates.join(', ')}. Only one entry per room per day is allowed.`
                }, { status: 409 });
            }

            const insert = sqliteDb.prepare('INSERT INTO energy_data (room_id, date, energy_consumption_kwh, uploaded_by, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)');
            const insertMany = sqliteDb.transaction((entries) => {
                for (const entry of entries) {
                    insert.run(
                        entry.room_id,
                        entry.date,
                        parseFloat(entry.energy_consumption_kwh),
                        entry.uploaded_by || null,
                        entry.notes || null,
                        new Date().toISOString()
                    );
                }
            });
            insertMany(body);
            return NextResponse.json({ success: true, count: body.length });
        } else {
            // Check duplicate for single entry
            const existing = sqliteDb.prepare('SELECT id FROM energy_data WHERE room_id = ? AND date = ?')
                .get(body.room_id, body.date);
            if (existing) {
                return NextResponse.json({
                    error: 'Energy log already exists for this room on this date. Only one entry per room per day is allowed.'
                }, { status: 409 });
            }

            const result = sqliteDb.prepare('INSERT INTO energy_data (room_id, date, energy_consumption_kwh, uploaded_by, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)')
                .run(
                    body.room_id,
                    body.date,
                    parseFloat(body.energy_consumption_kwh),
                    body.uploaded_by || null,
                    body.notes || null,
                    new Date().toISOString()
                );
            return NextResponse.json({ success: true, id: result.lastInsertRowid.toString() });
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // 1. Try MongoDB
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                await mongoDb.collection('energy_data').deleteOne({ _id: new ObjectId(id) });
                return NextResponse.json({ success: true });
            }
        } catch (mongoErr) {
            console.error('MongoDB DELETE energy-data error:', mongoErr);
        }

        // 2. Fallback to SQLite
        const sqliteDb = getSqliteDb();
        sqliteDb.prepare('DELETE FROM energy_data WHERE id = ?').run(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
