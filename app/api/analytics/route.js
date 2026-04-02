import { NextResponse } from 'next/server';
import { getDb as getMongoDb } from '@/lib/mongodb';
import getSqliteDb from '@/lib/db';

// Helper: compute date boundaries for each period type
function getDateRanges(type) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // Current period start
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Previous period
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Comparison range
  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];

  const fmt = d => d.toISOString().split('T')[0];

  if (type === 'weekly') {
    return {
      periodStart: fmt(weekStart),
      periodEnd: today,
      prevStart: fmt(lastWeekStart),
      prevEnd: fmt(lastWeekEnd),
      comparisonStart: fourWeeksAgo,
      comparisonEnd: today,
      effCurrent: { start: fmt(weekStart), end: today },
      effPrev: { start: fmt(lastWeekStart), end: fmt(lastWeekEnd) },
      effAvg: { start: fourWeeksAgo, end: today },
    };
  } else if (type === 'monthly') {
    return {
      periodStart: fmt(monthStart),
      periodEnd: today,
      prevStart: fmt(lastMonthStart),
      prevEnd: fmt(lastMonthEnd),
      comparisonStart: threeMonthsAgo,
      comparisonEnd: today,
      effCurrent: { start: fmt(monthStart), end: today },
      effPrev: { start: fmt(lastMonthStart), end: fmt(lastMonthEnd) },
      effAvg: { start: threeMonthsAgo, end: today },
    };
  }
  // daily (default)
  return {
    periodStart: today,
    periodEnd: today,
    prevStart: yesterday,
    prevEnd: yesterday,
    comparisonStart: sevenDaysAgo,
    comparisonEnd: today,
    effCurrent: { start: today, end: today },
    effPrev: { start: yesterday, end: yesterday },
    effAvg: { start: sevenDaysAgo, end: today },
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const blockId = searchParams.get('block_id') || '';
    const ranges = getDateRanges(type);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    // 1. Try MongoDB (basic — period-aware)
    try {
      const mongoDb = await getMongoDb();
      if (mongoDb) {
        const periodData = await mongoDb.collection('energy_data').aggregate([
          { $match: { date: { $gte: ranges.periodStart, $lte: ranges.periodEnd } } },
          { $group: { _id: null, total: { $sum: '$energy_consumption_kwh' }, rooms: { $addToSet: '$room_id' } } }
        ]).toArray();

        const compData = await mongoDb.collection('energy_data').aggregate([
          { $match: { date: { $gte: ranges.comparisonStart, $lte: ranges.comparisonEnd } } },
          { $group: { _id: null, total: { $sum: '$energy_consumption_kwh' } } }
        ]).toArray();

        const periodTotal = periodData[0]?.total || 0;
        const activeRooms = periodData[0]?.rooms?.length || 0;
        const periodAvg = activeRooms > 0 ? periodTotal / activeRooms : 0;
        const compTotal = compData[0]?.total || 0;

        return NextResponse.json({
          kpi: { period_total: periodTotal, period_avg: periodAvg, active_rooms: activeRooms, comparison_total: compTotal },
          timeSeries: [], blockDistribution: [], buildingComparison: [], roomEfficiency: [],
          monthlyConsumption: [], dailyConsumption: [], weeklyConsumption: []
        });
      }
    } catch (mongoErr) {
      console.error('MongoDB analytics error:', mongoErr);
    }

    // 2. Fallback to SQLite
    const db = getSqliteDb();

    // ── Period-Aware KPI Summary ──
    const kpiRow = db.prepare(`
      SELECT COALESCE(SUM(energy_consumption_kwh), 0) as total,
             COUNT(DISTINCT room_id) as active_rooms
      FROM energy_data WHERE date >= ? AND date <= ?
    `).get(ranges.periodStart, ranges.periodEnd);

    const compRow = db.prepare(`
      SELECT COALESCE(SUM(energy_consumption_kwh), 0) as total
      FROM energy_data WHERE date >= ? AND date <= ?
    `).get(ranges.comparisonStart, ranges.comparisonEnd);

    const periodTotal = kpiRow.total;
    const activeRooms = kpiRow.active_rooms;
    const periodAvg = activeRooms > 0 ? periodTotal / activeRooms : 0;
    const compTotal = compRow.total;

    // ── Time Series ──
    let timeSeries = [];
    if (type === 'daily') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      let query = `
        SELECT e.date as period,
               SUM(e.energy_consumption_kwh) as total,
               AVG(e.energy_consumption_kwh) as avg_consumption
        FROM energy_data e
        JOIN rooms r ON e.room_id = r.id
        JOIN buildings bu ON r.building_id = bu.id
        WHERE e.date >= ?
      `;
      const params = [thirtyDaysAgo];
      if (blockId) { query += ' AND bu.block_id = ?'; params.push(blockId); }
      query += ' GROUP BY e.date ORDER BY e.date ASC';
      timeSeries = db.prepare(query).all(...params);
    } else if (type === 'weekly') {
      let query = `
        SELECT strftime('%Y-W%W', e.date) as period,
               SUM(e.energy_consumption_kwh) as total,
               AVG(e.energy_consumption_kwh) as avg_consumption
        FROM energy_data e
        JOIN rooms r ON e.room_id = r.id
        JOIN buildings bu ON r.building_id = bu.id
        WHERE e.date >= date('now', '-84 days')
      `;
      const params = [];
      if (blockId) { query += ' AND bu.block_id = ?'; params.push(blockId); }
      query += " GROUP BY strftime('%Y-W%W', e.date) ORDER BY period ASC";
      timeSeries = db.prepare(query).all(...params);
    } else {
      let query = `
        SELECT strftime('%Y-%m', e.date) as period,
               SUM(e.energy_consumption_kwh) as total,
               AVG(e.energy_consumption_kwh) as avg_consumption
        FROM energy_data e
        JOIN rooms r ON e.room_id = r.id
        JOIN buildings bu ON r.building_id = bu.id
        WHERE e.date >= date('now', '-180 days')
      `;
      const params = [];
      if (blockId) { query += ' AND bu.block_id = ?'; params.push(blockId); }
      query += " GROUP BY strftime('%Y-%m', e.date) ORDER BY period ASC";
      timeSeries = db.prepare(query).all(...params);
    }

    // ── Period-Aware Block Distribution ──
    const blockDistribution = db.prepare(`
      SELECT b.name, SUM(e.energy_consumption_kwh) as total
      FROM energy_data e
      JOIN rooms r ON e.room_id = r.id
      JOIN buildings bu ON r.building_id = bu.id
      JOIN blocks b ON bu.block_id = b.id
      WHERE e.date >= ? AND e.date <= ?
      GROUP BY b.name
    `).all(ranges.periodStart, ranges.periodEnd);

    // ── Period-Aware Building Comparison ──
    const buildingComparison = db.prepare(`
      SELECT bu.name as building, SUM(e.energy_consumption_kwh) as total
      FROM energy_data e
      JOIN rooms r ON e.room_id = r.id
      JOIN buildings bu ON r.building_id = bu.id
      WHERE e.date >= ? AND e.date <= ?
      GROUP BY bu.name
      ORDER BY total DESC
    `).all(ranges.periodStart, ranges.periodEnd);

    // ── Period-Aware Room Efficiency ──
    const roomEfficiency = db.prepare(`
      SELECT r.id as room_id, r.room_name, r.threshold_kwh,
             bu.name as building_name, b.name as block_name,
             (SELECT COALESCE(SUM(energy_consumption_kwh), 0) FROM energy_data WHERE room_id = r.id AND date >= ? AND date <= ?) as current_period,
             (SELECT COALESCE(SUM(energy_consumption_kwh), 0) FROM energy_data WHERE room_id = r.id AND date >= ? AND date <= ?) as prev_period,
             (SELECT AVG(energy_consumption_kwh) FROM energy_data WHERE room_id = r.id AND date >= ? AND date <= ?) as avg_period
      FROM rooms r
      JOIN buildings bu ON r.building_id = bu.id
      JOIN blocks b ON bu.block_id = b.id
    `).all(
      ranges.effCurrent.start, ranges.effCurrent.end,
      ranges.effPrev.start, ranges.effPrev.end,
      ranges.effAvg.start, ranges.effAvg.end
    );

    // ── Monthly Consumption Summary (Last 12 months) ──
    const monthlyConsumption = db.prepare(`
      SELECT strftime('%Y-%m', e.date) as month,
             CASE 
               WHEN strftime('%m', e.date) = '01' THEN 'January'
               WHEN strftime('%m', e.date) = '02' THEN 'February'
               WHEN strftime('%m', e.date) = '03' THEN 'March'
               WHEN strftime('%m', e.date) = '04' THEN 'April'
               WHEN strftime('%m', e.date) = '05' THEN 'May'
               WHEN strftime('%m', e.date) = '06' THEN 'June'
               WHEN strftime('%m', e.date) = '07' THEN 'July'
               WHEN strftime('%m', e.date) = '08' THEN 'August'
               WHEN strftime('%m', e.date) = '09' THEN 'September'
               WHEN strftime('%m', e.date) = '10' THEN 'October'
               WHEN strftime('%m', e.date) = '11' THEN 'November'
               WHEN strftime('%m', e.date) = '12' THEN 'December'
             END || ' ' || strftime('%Y', e.date) as month_label,
             SUM(e.energy_consumption_kwh) as total,
             COUNT(DISTINCT e.date) as days_with_data,
             AVG(e.energy_consumption_kwh) as avg_daily
      FROM energy_data e
      WHERE e.date >= date('now', '-365 days')
      GROUP BY strftime('%Y-%m', e.date)
      ORDER BY month DESC
    `).all();

    // ── Daily Consumption Summary (Last 30 days) ──
    const dailyConsumption = db.prepare(`
      SELECT e.date as period,
             CASE
               WHEN strftime('%m', e.date) = '01' THEN 'January'
               WHEN strftime('%m', e.date) = '02' THEN 'February'
               WHEN strftime('%m', e.date) = '03' THEN 'March'
               WHEN strftime('%m', e.date) = '04' THEN 'April'
               WHEN strftime('%m', e.date) = '05' THEN 'May'
               WHEN strftime('%m', e.date) = '06' THEN 'June'
               WHEN strftime('%m', e.date) = '07' THEN 'July'
               WHEN strftime('%m', e.date) = '08' THEN 'August'
               WHEN strftime('%m', e.date) = '09' THEN 'September'
               WHEN strftime('%m', e.date) = '10' THEN 'October'
               WHEN strftime('%m', e.date) = '11' THEN 'November'
               WHEN strftime('%m', e.date) = '12' THEN 'December'
             END || ' ' || strftime('%d, %Y', e.date) as period_label,
             SUM(e.energy_consumption_kwh) as total,
             COUNT(DISTINCT r.id) as rooms_active,
             AVG(e.energy_consumption_kwh) as avg_consumption
      FROM energy_data e
      JOIN rooms r ON e.room_id = r.id
      WHERE e.date >= date('now', '-30 days')
      GROUP BY e.date
      ORDER BY e.date DESC
    `).all();

    // ── Weekly Consumption Summary (Last 12 weeks) ──
    const weeklyConsumption = db.prepare(`
      SELECT strftime('%Y-W%W', e.date) as week_num,
             'Week ' || strftime('%W', e.date) || ' (' || MIN(e.date) || ' to ' || MAX(e.date) || ')' as period_label,
             SUM(e.energy_consumption_kwh) as total,
             COUNT(DISTINCT e.date) as days_with_data,
             AVG(e.energy_consumption_kwh) as avg_daily
      FROM energy_data e
      WHERE e.date >= date('now', '-84 days')
      GROUP BY strftime('%Y-W%W', e.date)
      ORDER BY week_num DESC
    `).all();

    return NextResponse.json({
      kpi: {
        period_total: periodTotal,
        period_avg: periodAvg,
        active_rooms: activeRooms,
        comparison_total: compTotal
      },
      timeSeries,
      blockDistribution,
      buildingComparison,
      roomEfficiency,
      monthlyConsumption,
      dailyConsumption,
      weeklyConsumption
    });
  } catch (err) {
    console.error('Core analytics error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
