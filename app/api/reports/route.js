import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
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

        // All rooms with consumption in period
        const rooms = db.prepare(`
      SELECT r.room_name, r.threshold_kwh, r.sensor_id,
        bld.name as building_name, blk.name as block_name,
        SUM(ed.energy_consumption_kwh) as total_kwh,
        AVG(ed.energy_consumption_kwh) as avg_kwh,
        COUNT(ed.id) as data_points
      FROM energy_data ed
      JOIN rooms r ON r.id = ed.room_id
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
      WHERE ed.date >= ?
      GROUP BY r.id ORDER BY total_kwh DESC
    `).all(startDate);

        const allRooms = db.prepare(`
      SELECT AVG(energy_consumption_kwh) as global_avg
      FROM energy_data WHERE date >= ?
    `).get(startDate);
        const globalAvg = allRooms?.global_avg || 0;

        // Generate AI insights
        const insights = [];
        const inefficientRooms = rooms.filter(r => r.avg_kwh > r.threshold_kwh);
        const efficientRooms = rooms.filter(r => r.avg_kwh < r.threshold_kwh * 0.7);

        // Top insight
        if (rooms.length > 0) {
            const topRoom = rooms[0];
            const pctAboveAvg = ((topRoom.avg_kwh - globalAvg) / globalAvg * 100).toFixed(1);
            if (pctAboveAvg > 0) {
                insights.push({
                    type: 'warning',
                    icon: 'warning',
                    text: `${topRoom.room_name} (${topRoom.building_name}) consumes ${pctAboveAvg}% more than campus average.`
                });
            }
        }

        // Inefficient rooms
        inefficientRooms.slice(0, 3).forEach(r => {
            const pct = ((r.avg_kwh - r.threshold_kwh) / r.threshold_kwh * 100).toFixed(1);
            insights.push({
                type: 'alert',
                icon: 'alert',
                text: `${r.room_name} in ${r.building_name} exceeds threshold by ${pct}% (avg: ${r.avg_kwh.toFixed(1)} kWh, limit: ${r.threshold_kwh} kWh).`
            });
        });

        // Efficient rooms
        efficientRooms.slice(0, 2).forEach(r => {
            const savings = (r.threshold_kwh - r.avg_kwh).toFixed(1);
            insights.push({
                type: 'success',
                icon: 'success',
                text: `${r.room_name} (${r.building_name}) is performing well — saving ${savings} kWh below threshold.`
            });
        });

        // Peak detection
        const peakDay = db.prepare(`
      SELECT date, SUM(energy_consumption_kwh) as total
      FROM energy_data WHERE date >= ?
      GROUP BY date ORDER BY total DESC LIMIT 1
    `).get(startDate);
        if (peakDay) {
            insights.push({
                type: 'info',
                icon: 'chart',
                text: `Peak consumption recorded on ${peakDay.date}: ${peakDay.total.toFixed(1)} kWh campus-wide. Consider load balancing.`
            });
        }

        // Pattern insights
        if (type === 'weekly') {
            const weekendAvg = db.prepare(`
        SELECT AVG(energy_consumption_kwh) as avg FROM energy_data
        WHERE strftime('%w', date) IN ('0', '6') AND date >= ?
      `).get(startDate);
            const weekdayAvg = db.prepare(`
        SELECT AVG(energy_consumption_kwh) as avg FROM energy_data
        WHERE strftime('%w', date) NOT IN ('0', '6') AND date >= ?
      `).get(startDate);
            if (weekendAvg?.avg && weekdayAvg?.avg) {
                const diff = (((weekdayAvg.avg - weekendAvg.avg) / weekendAvg.avg) * 100).toFixed(1);
                insights.push({
                    type: 'info',
                    icon: 'bar',
                    text: `Weekday consumption is ${diff}% higher than weekends. Consider automated shutdowns on weekends.`
                });
            }
        }

        if (type === 'monthly') {
            insights.push({
                type: 'tip',
                icon: 'tip',
                text: `Installing motion-sensor lighting in low-occupancy rooms could reduce consumption by up to 25%.`
            });
            insights.push({
                type: 'tip',
                icon: 'tip',
                text: `HVAC scheduling optimization during non-peak hours could yield 15-20% monthly energy savings.`
            });
        }

        // Block-level efficiency ranking
        const blockRanking = db.prepare(`
      SELECT blk.name as block, SUM(ed.energy_consumption_kwh) as total,
        AVG(ed.energy_consumption_kwh) as avg_per_room
      FROM energy_data ed
      JOIN rooms r ON r.id = ed.room_id
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
      WHERE ed.date >= ?
      GROUP BY blk.id ORDER BY avg_per_room ASC
    `).all(startDate);

        return NextResponse.json({
            type,
            period: { start: startDate, end: todayStr },
            summary: {
                total_kwh: rooms.reduce((s, r) => s + r.total_kwh, 0).toFixed(2),
                avg_kwh: globalAvg.toFixed(2),
                rooms_monitored: rooms.length,
                rooms_above_threshold: inefficientRooms.length,
                rooms_efficient: efficientRooms.length,
            },
            top_rooms: rooms.slice(0, 10),
            inefficient_rooms: inefficientRooms.slice(0, 5),
            efficient_rooms: efficientRooms.slice(0, 5),
            insights,
            block_ranking: blockRanking,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
