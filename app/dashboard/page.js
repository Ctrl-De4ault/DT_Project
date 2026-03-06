'use client';
import { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Zap, Grid, Building2, DoorOpen, BarChart2, Calendar, CircleAlert, CircleCheck, TriangleAlert, Home, Plus } from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
            <div style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value} kWh
                </div>
            ))}
        </div>
    );
};

function EfficiencyBadge({ today, yesterday, threshold }) {
    if (!today || !yesterday) return <span className="badge badge-info">Calculating...</span>;
    const ratio = yesterday / today;
    if (today > threshold) return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CircleAlert size={12} /> Inefficient</span>;
    if (ratio >= 1) return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CircleCheck size={12} /> Efficient</span>;
    return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TriangleAlert size={12} /> Moderate</span>;
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState('daily');
    const [graphMode, setGraphMode] = useState('line');
    const [blockFilter, setBlockFilter] = useState('');
    const [blocks, setBlocks] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            const params = new URLSearchParams({ type: chartType });
            if (blockFilter) params.append('block_id', blockFilter);
            const [analyticsRes, blocksRes] = await Promise.all([
                fetch(`/api/analytics?${params}`),
                blocks.length ? Promise.resolve(null) : fetch('/api/blocks'),
            ]);
            if (isMounted) {
                const analytics = await analyticsRes.json();
                setData(analytics);
                if (blocksRes) setBlocks(await blocksRes.json());
                setLoading(false);
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [chartType, blockFilter, blocks.length]);

    const fetchData = async () => {
        const params = new URLSearchParams({ type: chartType });
        if (blockFilter) params.append('block_id', blockFilter);
        const [analyticsRes, blocksRes] = await Promise.all([
            fetch(`/api/analytics?${params}`),
            blocks.length ? Promise.resolve(null) : fetch('/api/blocks'),
        ]);
        const analytics = await analyticsRes.json();
        setData(analytics);
        if (blocksRes) setBlocks(await blocksRes.json());
        setLoading(false);
    };

    // Quick log function for today's energy
    const handleQuickLog = async () => {
        const today = new Date().toISOString().split('T')[0];
        // Get first available room for quick log
        const roomsRes = await fetch('/api/rooms');
        const rooms = await roomsRes.json();
        if (rooms.length === 0) {
            alert('No rooms available for quick logging');
            return;
        }
        
        const kWh = prompt('Enter energy consumption (kWh) for today:', '50');
        if (kWh && !isNaN(kWh)) {
            const res = await fetch('/api/energy-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room_id: rooms[0].id,
                    date: today,
                    energy_consumption_kwh: parseFloat(kWh),
                    notes: 'Quick log from dashboard'
                }),
            });
            if (res.ok) {
                alert('Energy log added successfully!');
                fetchData(); // Refresh data
            } else {
                alert('Failed to add energy log');
            }
        }
    };

    if (loading) return (
        <div style={{ padding: 24 }}>
            <div className="page-header">
                <div><div className="page-title loading" style={{ width: 200, height: 28, background: 'var(--bg-tertiary)', borderRadius: 6 }} /></div>
            </div>
            <div className="kpi-grid">
                {[1, 2, 3, 4].map(i => <div key={i} className="kpi-card loading" style={{ height: 110 }} />)}
            </div>
        </div>
    );

    const todayTotal = data?.kpi?.today_total?.toFixed(1) || '0';
    const todayAvg = data?.kpi?.today_avg?.toFixed(1) || '0';
    const activeRooms = data?.kpi?.active_rooms_today || 0;
    const weekTotal = data?.kpi?.week_total?.toFixed(1) || '0';

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Energy Dashboard</h1>
                    <p className="page-desc">Real-time campus energy overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleQuickLog}>
                        <Plus size={16} style={{ display: 'inline', marginRight: 4 }} /> Quick Log
                    </button>
                    <div className="segment">
                        {['daily', 'weekly', 'monthly'].map(t => (
                            <button key={t} className={`segment-btn ${chartType === t ? 'active' : ''}`} onClick={() => setChartType(t)}>
                                {t === 'daily' ? 'Day' : t === 'weekly' ? 'Week' : 'Month'}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={fetchData}>↻ Refresh</button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card accent">
                    <div className="kpi-icon"><Zap size={24} /></div>
                    <div className="kpi-value">{todayTotal}</div>
                    <div className="kpi-label">kWh Today</div>
                    <div className="kpi-trend">Campus total energy consumed today</div>
                </div>
                <div className="kpi-card success">
                    <div className="kpi-icon"><BarChart2 size={24} /></div>
                    <div className="kpi-value">{todayAvg}</div>
                    <div className="kpi-label">Avg kWh / Room</div>
                    <div className="kpi-trend">Per-room average today</div>
                </div>
                <div className="kpi-card warning">
                    <div className="kpi-icon"><Home size={24} /></div>
                    <div className="kpi-value">{activeRooms}</div>
                    <div className="kpi-label">Active Rooms</div>
                    <div className="kpi-trend">Rooms with data today</div>
                </div>
                <div className="kpi-card danger">
                    <div className="kpi-icon"><Calendar size={24} /></div>
                    <div className="kpi-value">{parseFloat(weekTotal).toFixed(0)}</div>
                    <div className="kpi-label">kWh This Week</div>
                    <div className="kpi-trend">7-day rolling total</div>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="charts-grid">
                {/* Time Series */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18} /> Energy Usage Trend</div>
                            <div className="card-subtitle">{chartType === 'daily' ? 'Last 30 days' : chartType === 'weekly' ? 'Last 12 weeks' : 'Last 6 months'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select className="form-control" style={{ width: 140, padding: '5px 10px', fontSize: 12 }} value={blockFilter} onChange={e => setBlockFilter(e.target.value)}>
                                <option value="">All Blocks</option>
                                {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <div className="segment">
                                <button className={`segment-btn ${graphMode === 'line' ? 'active' : ''}`} onClick={() => setGraphMode('line')}>Line</button>
                                <button className={`segment-btn ${graphMode === 'bar' ? 'active' : ''}`} onClick={() => setGraphMode('bar')}>Bar</button>
                            </div>
                        </div>
                    </div>
                    <div className="chart-container" style={{ height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {graphMode === 'line' ? (
                                <LineChart data={data?.timeSeries || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2.5} dot={false} name="Total kWh" />
                                    <Line type="monotone" dataKey="avg_consumption" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Avg kWh" />
                                </LineChart>
                            ) : (
                                <BarChart data={data?.timeSeries || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total" fill="#4F46E5" name="Total kWh" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Grid size={18} /> Block Distribution</div>
                            <div className="card-subtitle">Energy share by block</div>
                        </div>
                    </div>
                    <div className="chart-container" style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.blockDistribution || []}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={90}
                                    dataKey="total" nameKey="name"
                                >
                                    {(data?.blockDistribution || []).map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => [`${v.toFixed(1)} kWh`]} contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
                                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Block stats */}
                    <div style={{ marginTop: 8 }}>
                        {(data?.blockDistribution || []).map((b, i) => (
                            <div className="stat-row" key={i}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, background: COLORS[i % COLORS.length], borderRadius: '50%' }} />
                                    <span className="stat-label">{b.name}</span>
                                </div>
                                <span className="stat-value">{b.total?.toFixed(1)} kWh</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Building Comparison */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={18} /> Building Comparison (Last 7 Days)</div>
                        <div className="card-subtitle">Total consumption by building</div>
                    </div>
                </div>
                <div className="chart-container" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data?.buildingComparison || []} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="building" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="total" name="Total kWh" radius={[0, 4, 4, 0]}>
                                {(data?.buildingComparison || []).map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Room Efficiency Table */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DoorOpen size={18} /> Room Efficiency Overview</div>
                        <div className="card-subtitle">Today vs yesterday vs last week average</div>
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Room</th>
                                <th>Building</th>
                                <th>Block</th>
                                <th>Today (kWh)</th>
                                <th>Yesterday (kWh)</th>
                                <th>Last Week Avg</th>
                                <th>Threshold</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.roomEfficiency || []).map((r, i) => {
                                const effScore = r.yesterday && r.today ? ((r.yesterday - r.today) / r.yesterday * 100) : null;
                                return (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{r.room_name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.building_name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.block_name}</td>
                                        <td style={{ fontWeight: 600, color: r.today > r.threshold_kwh ? 'var(--danger)' : 'var(--text-primary)' }}>
                                            {r.today?.toFixed(1) || '—'}
                                        </td>
                                        <td>{r.yesterday?.toFixed(1) || '—'}</td>
                                        <td>{r.last_week_avg?.toFixed(1) || '—'}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{r.threshold_kwh} kWh</td>
                                        <td>
                                            <EfficiencyBadge today={r.today} yesterday={r.yesterday} threshold={r.threshold_kwh} />
                                            {effScore !== null && (
                                                <span style={{ fontSize: 11, color: effScore > 0 ? 'var(--success)' : 'var(--danger)', marginLeft: 6 }}>
                                                    {effScore > 0 ? `↓${effScore.toFixed(1)}%` : `↑${Math.abs(effScore).toFixed(1)}%`}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
