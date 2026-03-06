import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'daily'; // daily, weekly, monthly
        const blockId = searchParams.get('block_id');
        const buildingId = searchParams.get('building_id');

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        let startDate;
        let groupBy;
        if (type === 'monthly') {
            startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().split('T')[0];
            groupBy = "strftime('%Y-%m', ed.date)";
        } else if (type === 'weekly') {
            startDate = new Date(Date.now() - 11 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            groupBy = "strftime('%Y-W%W', ed.date)";
        } else {
            startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            groupBy = 'ed.date';
        }

        // Block distribution (pie)
        const blockDistribution = db.prepare(`
      SELECT blk.name, SUM(ed.energy_consumption_kwh) as total
      FROM energy_data ed
      JOIN rooms r ON r.id = ed.room_id
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
      WHERE ed.date >= ?
      GROUP BY blk.id ORDER BY total DESC
    `).all(startDate);

        // Time series aggregated
        let timeQuery = `
      SELECT ${groupBy} as period, SUM(ed.energy_consumption_kwh) as total,
        AVG(ed.energy_consumption_kwh) as avg_consumption,
        COUNT(DISTINCT ed.room_id) as active_rooms
      FROM energy_data ed
      JOIN rooms r ON r.id = ed.room_id
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
      WHERE ed.date >= ?
    `;
        const args = [startDate];
        if (blockId) { timeQuery += ' AND blk.id = ?'; args.push(blockId); }
        if (buildingId) { timeQuery += ' AND bld.id = ?'; args.push(buildingId); }
        timeQuery += ` GROUP BY ${groupBy} ORDER BY period`;
        const timeSeries = db.prepare(timeQuery).all(...args);

        // Building comparison (last 7 days)
        const buildingComparison = db.prepare(`
      SELECT bld.name as building, blk.name as block, SUM(ed.energy_consumption_kwh) as total,
        AVG(ed.energy_consumption_kwh) as avg
      FROM energy_data ed
      JOIN rooms r ON r.id = ed.room_id
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
      WHERE ed.date >= date('now', '-7 days')
      GROUP BY bld.id ORDER BY total DESC LIMIT 10
    `).all();

        // Room efficiency (today vs yesterday vs last week)
        const roomEfficiency = db.prepare(`
      SELECT r.room_name, r.threshold_kwh,
        bld.name as building_name, blk.name as block_name,
        (SELECT energy_consumption_kwh FROM energy_data WHERE room_id = r.id AND date = ? LIMIT 1) as today,
        (SELECT energy_consumption_kwh FROM energy_data WHERE room_id = r.id AND date = date(?, '-1 day') LIMIT 1) as yesterday,
        (SELECT AVG(energy_consumption_kwh) FROM energy_data WHERE room_id = r.id AND date >= date(?, '-7 days') AND date < ?) as last_week_avg
      FROM rooms r
      JOIN buildings bld ON bld.id = r.building_id
      JOIN blocks blk ON blk.id = bld.block_id
      ORDER BY today DESC NULLS LAST LIMIT 18
    `).all(todayStr, todayStr, todayStr, todayStr);

        // KPI stats
        const kpi = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN date = ? THEN energy_consumption_kwh END), 0) as today_total,
        COALESCE(AVG(CASE WHEN date = ? THEN energy_consumption_kwh END), 0) as today_avg,
        COUNT(DISTINCT CASE WHEN date = ? THEN room_id END) as active_rooms_today,
        COALESCE(SUM(CASE WHEN date >= date(?, '-7 days') THEN energy_consumption_kwh END), 0) as week_total
      FROM energy_data
    `).get(todayStr, todayStr, todayStr, todayStr);

        // Alert count
        const alertCount = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'pending'").get();

        return NextResponse.json({
            blockDistribution,
            timeSeries,
            buildingComparison,
            roomEfficiency,
            kpi,
            alertCount: alertCount.count,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
