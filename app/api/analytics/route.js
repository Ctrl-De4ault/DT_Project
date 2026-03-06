import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    // 1. KPI Summary Aggregation
    const kpis = await db.collection('energy_data').aggregate([
      {
        $facet: {
          totalEnergy: [
            { $group: { _id: null, total: { $sum: '$energy_consumption_kwh' } } }
          ],
          todayEnergy: [
            { $match: { date: today } },
            { $group: { _id: null, total: { $sum: '$energy_consumption_kwh' } } }
          ],
          roomCounts: [
            { $group: { _id: '$room_id' } },
            { $count: 'count' }
          ]
        }
      }
    ]).toArray();

    const totalKwh = kpis[0].totalEnergy[0]?.total || 0;
    const todayKwh = kpis[0].todayEnergy[0]?.total || 0;
    const roomsCount = kpis[0].roomCounts[0]?.count || 0;

    // 2. Daily Consumption Trend (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const trend = await db.collection('energy_data').aggregate([
      { $match: { date: { $gte: sevenDaysAgoStr } } },
      {
        $group: {
          _id: '$date',
          total: { $sum: '$energy_consumption_kwh' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', total: 1, _id: 0 } }
    ]).toArray();

    // 3. Consumption by Block
    const blockStats = await db.collection('energy_data').aggregate([
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
          value: { $sum: '$energy_consumption_kwh' }
        }
      },
      { $project: { name: '$_id', value: 1, _id: 0 } }
    ]).toArray();

    // 4. Efficiency Status (Rooms above/below threshold)
    const roomsSnapshot = await db.collection('rooms').find({}).toArray();
    const roomConsumption = await db.collection('energy_data').aggregate([
      {
        $group: {
          _id: '$room_id',
          avg: { $avg: '$energy_consumption_kwh' }
        }
      }
    ]).toArray();

    const consumptionMap = {};
    roomConsumption.forEach(c => consumptionMap[c._id.toString()] = c.avg);

    let efficient = 0, warning = 0, critical = 0;
    roomsSnapshot.forEach(r => {
      const avg = consumptionMap[r._id.toString()] || 0;
      if (avg > r.threshold_kwh * 1.2) critical++;
      else if (avg > r.threshold_kwh) warning++;
      else efficient++;
    });

    return NextResponse.json({
      kpis: {
        total_kwh: totalKwh.toFixed(1),
        today_kwh: todayKwh.toFixed(1),
        active_rooms: roomsCount,
        efficiency_score: Math.round((efficient / roomsSnapshot.length) * 100) || 0
      },
      trend,
      distribution: blockStats,
      efficiency_chart: [
        { name: 'Efficient', value: efficient, color: '#22c55e' },
        { name: 'Warning', value: warning, color: '#f59e0b' },
        { name: 'Critical', value: critical, color: '#ef4444' }
      ]
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
