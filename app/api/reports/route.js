import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'daily';

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        let startDate;
        if (type === 'monthly') {
            startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0];
        } else if (type === 'weekly') {
            startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        } else {
            startDate = todayStr;
        }

        // 1. Try MongoDB first
        try {
            const mongoDb = await getMongoDb();
            if (mongoDb) {
                const roomStats = await mongoDb.collection('energy_data').aggregate([
                    { $match: { date: { $gte: startDate } } },
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
                    { $unwind: '$block' },
                    {
                        $group: {
                            _id: '$room_id',
                            room_name: { $first: '$room.room_name' },
                            threshold_kwh: { $first: '$room.threshold_kwh' },
                            building_name: { $first: '$building.name' },
                            block_name: { $first: '$block.name' },
                            total_kwh: { $sum: '$energy_consumption_kwh' },
                            avg_kwh: { $avg: '$energy_consumption_kwh' },
                            data_points: { $count: {} }
                        }
                    },
                    { $sort: { total_kwh: -1 } }
                ]).toArray();

                const globalStats = await mongoDb.collection('energy_data').aggregate([
                    { $match: { date: { $gte: startDate } } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$energy_consumption_kwh' },
                            avg: { $avg: '$energy_consumption_kwh' },
                            count: { $count: {} }
                        }
                    }
                ]).toArray();

                const globalTotal = globalStats[0]?.total || 0;
                const globalAvg = globalStats[0]?.avg || 0;

                const peaks = await mongoDb.collection('energy_data').aggregate([
                    { $match: { date: { $gte: startDate } } },
                    {
                        $group: {
                            _id: '$date',
                            total: { $sum: '$energy_consumption_kwh' }
                        }
                    },
                    { $sort: { total: -1 } },
                    { $limit: 1 }
                ]).toArray();

                const blockRanking = await mongoDb.collection('energy_data').aggregate([
                    { $match: { date: { $gte: startDate } } },
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
                    { $unwind: '$block' },
                    {
                        $group: {
                            _id: '$block.name',
                            total: { $sum: '$energy_consumption_kwh' },
                            avg_per_room: { $avg: '$energy_consumption_kwh' }
                        }
                    },
                    { $project: { block: '$_id', total: 1, avg_per_room: 1, _id: 0 } },
                    { $sort: { avg_per_room: 1 } }
                ]).toArray();

                const insights = [];
                const inefficientRooms = roomStats.filter(r => r.avg_kwh > r.threshold_kwh);
                const efficientRooms = roomStats.filter(r => r.avg_kwh < r.threshold_kwh * 0.7);

                if (roomStats.length > 0) {
                    const topRoom = roomStats[0];
                    const pctAboveAvg = globalAvg ? ((topRoom.avg_kwh - globalAvg) / globalAvg * 100).toFixed(1) : 0;
                    if (pctAboveAvg > 0) {
                        insights.push({
                            type: 'warning',
                            icon: 'warning',
                            text: `${topRoom.room_name} consumed ${pctAboveAvg}% more than campus average.`
                        });
                    }
                }

                if (peaks.length > 0) {
                    insights.push({
                        type: 'info',
                        icon: 'chart',
                        text: `Peak consumption of ${peaks[0].total.toFixed(1)} kWh recorded on ${peaks[0]._id}.`
                    });
                }

                inefficientRooms.slice(0, 3).forEach(r => {
                    insights.push({
                        type: 'alert',
                        icon: 'alert',
                        text: `${r.room_name} in ${r.building_name} exceeded threshold (avg ${r.avg_kwh.toFixed(1)} kWh).`
                    });
                });

                return NextResponse.json({
                    type,
                    period: { start: startDate, end: todayStr },
                    summary: {
                        total_kwh: globalTotal.toFixed(1),
                        avg_kwh: globalAvg.toFixed(1),
                        rooms_monitored: roomStats.length,
                        rooms_above_threshold: inefficientRooms.length,
                        rooms_efficient: efficientRooms.length,
                    },
                    top_rooms: roomStats.slice(0, 10),
                    inefficient_rooms: inefficientRooms.slice(0, 5),
                    efficient_rooms: efficientRooms.slice(0, 5),
                    insights,
                    block_ranking: blockRanking,
                });
            }
        } catch (mongoErr) {
            console.error('MongoDB reports error:', mongoErr);
        }

        // 2. Fallback to SQLite - simpler aggregation
        const sqliteDb = getSqliteDb();
        try {
            const energyData = sqliteDb.prepare(`
                SELECT ed.*, r.room_name, r.threshold_kwh, b.name as building_name, bl.name as block_name 
                FROM energy_data ed
                LEFT JOIN rooms r ON ed.room_id = r.id
                LEFT JOIN buildings b ON r.building_id = b.id
                LEFT JOIN blocks bl ON b.block_id = bl.id
                WHERE ed.date >= ?
                ORDER BY ed.energy_consumption_kwh DESC
            `).all(startDate);

            const globalStats = sqliteDb.prepare(`
                SELECT 
                    SUM(energy_consumption_kwh) as total,
                    AVG(energy_consumption_kwh) as avg,
                    COUNT(*) as count
                FROM energy_data
                WHERE date >= ?
            `).get(startDate);

            const roomStats = {};
            energyData.forEach(row => {
                if (!roomStats[row.room_id]) {
                    roomStats[row.room_id] = {
                        _id: row.room_id,
                        room_name: row.room_name || 'Unknown',
                        threshold_kwh: row.threshold_kwh || 0,
                        building_name: row.building_name || 'Unknown',
                        block_name: row.block_name || 'Unknown',
                        total_kwh: 0,
                        data_points: 0,
                        consumption: []
                    };
                }
                roomStats[row.room_id].total_kwh += row.energy_consumption_kwh;
                roomStats[row.room_id].data_points += 1;
                roomStats[row.room_id].consumption.push(row.energy_consumption_kwh);
            });

            const roomStatsArray = Object.values(roomStats).map(r => ({
                ...r,
                avg_kwh: r.consumption.length > 0 ? r.consumption.reduce((a, b) => a + b) / r.consumption.length : 0
            }));

            const globalTotal = globalStats?.total || 0;
            const globalAvg = globalStats?.avg || 0;

            const insights = [];
            const inefficientRooms = roomStatsArray.filter(r => r.avg_kwh > r.threshold_kwh);
            const efficientRooms = roomStatsArray.filter(r => r.avg_kwh < r.threshold_kwh * 0.7);

            if (roomStatsArray.length > 0) {
                const topRoom = roomStatsArray[0];
                const pctAboveAvg = globalAvg ? ((topRoom.avg_kwh - globalAvg) / globalAvg * 100).toFixed(1) : 0;
                if (pctAboveAvg > 0) {
                    insights.push({
                        type: 'warning',
                        icon: 'warning',
                        text: `${topRoom.room_name} consumed ${pctAboveAvg}% more than campus average.`
                    });
                }
            }

            return NextResponse.json({
                type,
                period: { start: startDate, end: todayStr },
                summary: {
                    total_kwh: globalTotal.toFixed(1),
                    avg_kwh: globalAvg.toFixed(1),
                    rooms_monitored: roomStatsArray.length,
                    rooms_above_threshold: inefficientRooms.length,
                    rooms_efficient: efficientRooms.length,
                },
                top_rooms: roomStatsArray.slice(0, 10),
                inefficient_rooms: inefficientRooms.slice(0, 5),
                efficient_rooms: efficientRooms.slice(0, 5),
                insights,
                block_ranking: [],
            });
        } catch (sqliteErr) {
            console.error('SQLite reports error:', sqliteErr);
            // Return empty report structure if no data available
            return NextResponse.json({
                type,
                period: { start: startDate, end: todayStr },
                summary: {
                    total_kwh: '0',
                    avg_kwh: '0',
                    rooms_monitored: 0,
                    rooms_above_threshold: 0,
                    rooms_efficient: 0,
                },
                top_rooms: [],
                inefficient_rooms: [],
                efficient_rooms: [],
                insights: [],
                block_ranking: [],
            });
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
