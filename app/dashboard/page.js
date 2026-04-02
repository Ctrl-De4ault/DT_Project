'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, Cell, AreaChart, Area,
    PieChart, Pie, RadialBarChart, RadialBar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Zap, Building2, DoorOpen, BarChart2, Calendar, CircleAlert, CircleCheck,
    TriangleAlert, Home, Plus, Eye, X, TrendingUp, TrendingDown, Activity,
    Gauge, PieChart as PieChartIcon, Layers
} from 'lucide-react';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];
const GRADIENT_COLORS = [
    ['#6366F1', '#818CF8'],
    ['#10B981', '#34D399'],
    ['#F59E0B', '#FBBF24'],
    ['#EF4444', '#F87171'],
    ['#3B82F6', '#60A5FA'],
    ['#8B5CF6', '#A78BFA'],
];

/* ── Animated Counter ── */
function AnimatedValue({ value, decimals = 1, duration = 800 }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const num = parseFloat(value) || 0;
        const start = display;
        const diff = num - start;
        const startTime = performance.now();
        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(start + diff * eased);
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [value]);
    return <>{display.toFixed(decimals)}</>;
}

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-label">{label}</div>
            {payload.map((p, i) => (
                <div key={i} className="chart-tooltip-value" style={{ color: p.color || '#fff' }}>
                    <span className="chart-tooltip-dot" style={{ background: p.color }} />
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value} kWh
                </div>
            ))}
        </div>
    );
};

/* ── Pie Tooltip ── */
const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-label">{d.name}</div>
            <div className="chart-tooltip-value" style={{ color: d.payload.fill }}>
                <span className="chart-tooltip-dot" style={{ background: d.payload.fill }} />
                {d.value?.toFixed(1)} kWh
            </div>
        </div>
    );
};

/* ── Custom Pie Label ── */
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 24;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#A3A3A3" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
            style={{ fontSize: 11, fontWeight: 500 }}>
            {name} ({(percent * 100).toFixed(0)}%)
        </text>
    );
};

/* ── Efficiency Badge ── */
function EfficiencyBadge({ today, yesterday, lastWeekAvg, threshold }) {
    if (!today) return <span className="badge badge-info">No data</span>;
    const comparison = yesterday || lastWeekAvg;
    if (today > threshold) return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CircleAlert size={12} /> Inefficient</span>;
    if (!comparison) return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TriangleAlert size={12} /> Insufficient data</span>;
    const ratio = comparison / today;
    if (ratio >= 1) return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CircleCheck size={12} /> Efficient</span>;
    return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TriangleAlert size={12} /> Moderate</span>;
}

/* ── Stat Mini Card ── */
function StatMini({ icon, label, value, color, trend }) {
    return (
        <div className="stat-mini">
            <div className="stat-mini-icon" style={{ background: `${color}18`, color }}>{icon}</div>
            <div className="stat-mini-info">
                <div className="stat-mini-value">{value}</div>
                <div className="stat-mini-label">{label}</div>
            </div>
            {trend !== undefined && trend !== null && (
                <div className={`stat-mini-trend ${trend >= 0 ? 'up' : 'down'}`}>
                    {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(trend).toFixed(1)}%
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState('daily');
    const [graphMode, setGraphMode] = useState('area');
    const [blockFilter, setBlockFilter] = useState('');
    const [blocks, setBlocks] = useState([]);
    const [logModal, setLogModal] = useState({ open: false, roomId: null, roomName: '' });
    const [roomLogs, setRoomLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const openLogModal = async (roomId, roomName) => {
        setLogModal({ open: true, roomId, roomName });
        setLogsLoading(true);
        try {
            const res = await fetch(`/api/energy-data?room_id=${roomId}`);
            const logs = await res.json();
            setRoomLogs(logs);
        } catch { setRoomLogs([]); }
        setLogsLoading(false);
    };
    const closeLogModal = () => { setLogModal({ open: false, roomId: null, roomName: '' }); setRoomLogs([]); };

    const fetchData = useCallback(async () => {
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
    }, [chartType, blockFilter, blocks.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleQuickLog = async () => {
        const today = new Date().toISOString().split('T')[0];
        const roomsRes = await fetch('/api/rooms');
        const rooms = await roomsRes.json();
        if (rooms.length === 0) { alert('No rooms available'); return; }
        const kWh = prompt('Enter energy consumption (kWh) for today:', '50');
        if (kWh && !isNaN(kWh)) {
            const res = await fetch('/api/energy-data', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: rooms[0].id, date: today, energy_consumption_kwh: parseFloat(kWh), notes: 'Quick log from dashboard' }),
            });
            if (res.ok) { alert('Energy log added!'); fetchData(); }
            else alert('Failed to add energy log');
        }
    };

    if (loading) return (
        <div style={{ padding: 24 }}>
            <div className="page-header">
                <div><div className="page-title loading" style={{ width: 200, height: 28, background: 'var(--bg-tertiary)', borderRadius: 6 }} /></div>
            </div>
            <div className="kpi-grid">
                {[1, 2, 3, 4].map(i => <div key={i} className="kpi-card loading" style={{ height: 130 }} />)}
            </div>
            <div className="charts-grid" style={{ marginTop: 20 }}>
                <div className="card loading" style={{ height: 340 }} />
                <div className="card loading" style={{ height: 340 }} />
            </div>
        </div>
    );

    const periodTotal = data?.kpi?.period_total?.toFixed(1) || '0';
    const periodAvg = data?.kpi?.period_avg?.toFixed(1) || '0';
    const activeRooms = data?.kpi?.active_rooms || 0;
    const compTotal = data?.kpi?.comparison_total?.toFixed(1) || '0';

    const periodLabels = {
        daily: { total: 'kWh Today', avg: 'Avg kWh / Room', rooms: 'Active Rooms', comp: 'Weekly Total', compTrend: '7-day rolling', desc: 'Daily', trendSub: 'Last 30 days' },
        weekly: { total: 'kWh This Week', avg: 'Avg kWh / Room', rooms: 'Active Rooms', comp: '4-Week Total', compTrend: '4-week rolling', desc: 'Weekly', trendSub: 'Last 12 weeks' },
        monthly: { total: 'kWh This Month', avg: 'Avg kWh / Room', rooms: 'Active Rooms', comp: '3-Month Total', compTrend: '3-month rolling', desc: 'Monthly', trendSub: 'Last 6 months' },
    };
    const labels = periodLabels[chartType] || periodLabels.daily;

    // Pie data for block distribution
    const pieData = (data?.blockDistribution || []).map((d, i) => ({
        name: d.name, value: d.total, fill: COLORS[i % COLORS.length]
    }));
    const totalPie = pieData.reduce((s, d) => s + d.value, 0);

    // Building comparison with colors
    const buildingData = (data?.buildingComparison || []).map((d, i) => ({
        ...d, fill: COLORS[i % COLORS.length]
    }));

    // Efficiency summary stats
    const rooms = data?.roomEfficiency || [];
    const efficientCount = rooms.filter(r => r.current_period && r.current_period <= r.threshold_kwh).length;
    const inefficientCount = rooms.filter(r => r.current_period && r.current_period > r.threshold_kwh).length;
    const efficiencyRate = rooms.length > 0 ? (efficientCount / rooms.length * 100) : 0;

    // Radial data for efficiency gauge
    const gaugeData = [
        { name: 'Efficiency', value: efficiencyRate, fill: efficiencyRate >= 70 ? '#10B981' : efficiencyRate >= 40 ? '#F59E0B' : '#EF4444' }
    ];

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <span className="gradient-text">Energy Dashboard</span>
                    </h1>
                    <p className="page-desc">
                        {labels.desc} campus energy overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleQuickLog}>
                        <Plus size={16} /> Quick Log
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
                    <div className="kpi-card-glow" style={{ background: 'rgba(99, 102, 241, 0.08)' }} />
                    <div className="kpi-icon"><Zap size={22} /></div>
                    <div className="kpi-value"><AnimatedValue value={periodTotal} /></div>
                    <div className="kpi-label">{labels.total}</div>
                    <div className="kpi-trend">Campus total for selected period</div>
                </div>
                <div className="kpi-card success">
                    <div className="kpi-card-glow" style={{ background: 'rgba(16, 185, 129, 0.08)' }} />
                    <div className="kpi-icon"><BarChart2 size={22} /></div>
                    <div className="kpi-value"><AnimatedValue value={periodAvg} /></div>
                    <div className="kpi-label">{labels.avg}</div>
                    <div className="kpi-trend">Per-room average for period</div>
                </div>
                <div className="kpi-card warning">
                    <div className="kpi-card-glow" style={{ background: 'rgba(245, 158, 11, 0.08)' }} />
                    <div className="kpi-icon"><Home size={22} /></div>
                    <div className="kpi-value"><AnimatedValue value={activeRooms} decimals={0} /></div>
                    <div className="kpi-label">{labels.rooms}</div>
                    <div className="kpi-trend">Rooms with data in period</div>
                </div>
                <div className="kpi-card danger">
                    <div className="kpi-card-glow" style={{ background: 'rgba(239, 68, 68, 0.08)' }} />
                    <div className="kpi-icon"><Calendar size={22} /></div>
                    <div className="kpi-value"><AnimatedValue value={compTotal} decimals={0} /></div>
                    <div className="kpi-label">{labels.comp}</div>
                    <div className="kpi-trend">{labels.compTrend}</div>
                </div>
            </div>

            {/* Row 2: Energy Trend + Block Distribution Pie */}
            <div className="charts-grid" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
                {/* Area / Line / Bar Chart */}
                <div className="card premium-card">
                    <div className="card-header">
                        <div>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={18} style={{ color: '#6366F1' }} /> Energy Usage Trend
                            </div>
                            <div className="card-subtitle">{labels.trendSub}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select className="form-control" style={{ width: 130, padding: '5px 10px', fontSize: 12 }} value={blockFilter} onChange={e => setBlockFilter(e.target.value)}>
                                <option value="">All Blocks</option>
                                {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <div className="segment">
                                <button className={`segment-btn ${graphMode === 'area' ? 'active' : ''}`} onClick={() => setGraphMode('area')}>Area</button>
                                <button className={`segment-btn ${graphMode === 'line' ? 'active' : ''}`} onClick={() => setGraphMode('line')}>Line</button>
                                <button className={`segment-btn ${graphMode === 'bar' ? 'active' : ''}`} onClick={() => setGraphMode('bar')}>Bar</button>
                            </div>
                        </div>
                    </div>
                    <div className="chart-container" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {graphMode === 'area' ? (
                                <AreaChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradientAvg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="period" tick={{ fill: '#525252', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: '#525252', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2.5} fill="url(#gradientTotal)" name="Total kWh" />
                                    <Area type="monotone" dataKey="avg_consumption" stroke="#10B981" strokeWidth={2} fill="url(#gradientAvg)" name="Avg kWh" strokeDasharray="5 5" />
                                </AreaChart>
                            ) : graphMode === 'line' ? (
                                <LineChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="period" tick={{ fill: '#525252', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: '#525252', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2.5} dot={false} name="Total kWh" />
                                    <Line type="monotone" dataKey="avg_consumption" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Avg kWh" />
                                </LineChart>
                            ) : (
                                <BarChart data={data?.timeSeries || []} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#818CF8" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#6366F1" stopOpacity={0.6} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="period" tick={{ fill: '#525252', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: '#525252', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total" fill="url(#barGradient)" name="Total kWh" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Block Distribution Donut */}
                <div className="card premium-card">
                    <div className="card-header">
                        <div>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PieChartIcon size={18} style={{ color: '#8B5CF6' }} /> Block Distribution
                            </div>
                            <div className="card-subtitle">Energy share by block</div>
                        </div>
                    </div>
                    {pieData.length > 0 ? (
                        <div style={{ position: 'relative' }}>
                            <div className="chart-container" style={{ height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95}
                                            paddingAngle={3} dataKey="value" stroke="none"
                                            label={renderPieLabel} labelLine={false}>
                                            {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                        </Pie>
                                        <Tooltip content={<PieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Center label */}
                            <div className="donut-center">
                                <div className="donut-center-value">{totalPie.toFixed(0)}</div>
                                <div className="donut-center-label">kWh Total</div>
                            </div>
                            {/* Legend */}
                            <div className="pie-legend">
                                {pieData.map((d, i) => (
                                    <div key={i} className="pie-legend-item">
                                        <span className="pie-legend-dot" style={{ background: d.fill }} />
                                        <span className="pie-legend-name">{d.name}</span>
                                        <span className="pie-legend-val">{d.value.toFixed(1)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '60px 20px' }}>
                            <PieChartIcon size={36} style={{ opacity: 0.3 }} />
                            <div className="empty-text" style={{ marginTop: 8 }}>No block data available</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: Building Comparison + Efficiency Gauge */}
            <div className="charts-row">
                {/* Building Comparison */}
                <div className="card premium-card">
                    <div className="card-header">
                        <div>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={18} style={{ color: '#3B82F6' }} /> Building Comparison
                            </div>
                            <div className="card-subtitle">Total consumption by building</div>
                        </div>
                    </div>
                    <div className="chart-container" style={{ height: 240 }}>
                        {buildingData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={buildingData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#525252', fontSize: 11 }} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="building" tick={{ fill: '#A3A3A3', fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total" name="Total kWh" radius={[0, 8, 8, 0]} barSize={20}>
                                        {buildingData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state"><div className="empty-text">No building data</div></div>
                        )}
                    </div>
                </div>

                {/* Efficiency Gauge + Stats */}
                <div className="card premium-card">
                    <div className="card-header">
                        <div>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Gauge size={18} style={{ color: '#10B981' }} /> Efficiency Score
                            </div>
                            <div className="card-subtitle">Rooms within threshold</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div className="chart-container" style={{ height: 200, width: 200, flexShrink: 0, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={225} endAngle={-45}
                                    data={[{ value: 100, fill: 'rgba(255,255,255,0.04)' }, ...gaugeData]} barSize={12}>
                                    <RadialBar background={false} dataKey="value" cornerRadius={6} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="gauge-center">
                                <div className="gauge-value" style={{ color: gaugeData[0].fill }}>
                                    {efficiencyRate.toFixed(0)}%
                                </div>
                                <div className="gauge-label">Score</div>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <StatMini icon={<CircleCheck size={16} />} label="Efficient" value={efficientCount} color="#10B981" />
                            <StatMini icon={<CircleAlert size={16} />} label="Inefficient" value={inefficientCount} color="#EF4444" />
                            <StatMini icon={<Layers size={16} />} label="Total Rooms" value={rooms.length} color="#6366F1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Period Consumption Table */}
            <div className="card premium-card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} style={{ color: '#F59E0B' }} />
                            {chartType === 'daily' ? 'Daily Consumption' : chartType === 'weekly' ? 'Weekly Consumption' : 'Monthly Consumption'}
                        </div>
                        <div className="card-subtitle">
                            {chartType === 'daily' ? 'Last 30 days breakdown' : chartType === 'weekly' ? 'Last 12 weeks breakdown' : 'Last 12 months breakdown'}
                        </div>
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{chartType === 'daily' ? 'Date' : chartType === 'weekly' ? 'Week' : 'Month'}</th>
                                <th>Total (kWh)</th>
                                {chartType === 'daily' && <th>Active Rooms</th>}
                                {chartType !== 'daily' && <th>Days Recorded</th>}
                                <th>Daily Avg</th>
                                <th>Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const consumptionData = chartType === 'daily' ? data?.dailyConsumption :
                                    chartType === 'weekly' ? data?.weeklyConsumption :
                                        data?.monthlyConsumption;
                                return (consumptionData || []).map((item, i) => {
                                    const nextItem = consumptionData?.[i - 1];
                                    const trend = nextItem ? ((item.total - nextItem.total) / nextItem.total * 100) : null;
                                    const label = chartType === 'daily' ? item.period_label :
                                        chartType === 'weekly' ? item.period_label :
                                            item.month_label;
                                    const recordsCount = chartType === 'daily' ? item.rooms_active :
                                        chartType === 'weekly' ? item.days_with_data :
                                            item.days_with_data;
                                    const avgValue = chartType === 'daily' ? item.avg_consumption : item.avg_daily;
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{label}</td>
                                            <td style={{ fontWeight: 600, fontSize: 14 }}>{item.total?.toFixed(1)} kWh</td>
                                            {chartType === 'daily' && <td style={{ color: 'var(--text-secondary)' }}>{recordsCount} rooms</td>}
                                            {chartType !== 'daily' && <td style={{ color: 'var(--text-secondary)' }}>{recordsCount} days</td>}
                                            <td>{avgValue?.toFixed(2)} kWh</td>
                                            <td>
                                                {trend !== null ? (
                                                    <span className={`trend-badge ${trend > 0 ? 'up' : 'down'}`}>
                                                        {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {Math.abs(trend).toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Row 5: Room Efficiency Table */}
            <div className="card premium-card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DoorOpen size={18} style={{ color: '#EC4899' }} /> Room Efficiency Overview
                        </div>
                        <div className="card-subtitle">
                            {chartType === 'daily' ? 'Today vs yesterday vs last week avg' : chartType === 'weekly' ? 'This week vs last week vs 4-week avg' : 'This month vs last month vs 3-month avg'}
                        </div>
                    </div>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Room</th>
                                <th>Building</th>
                                <th>Block</th>
                                <th>{chartType === 'daily' ? 'Today' : chartType === 'weekly' ? 'This Week' : 'This Month'}</th>
                                <th>{chartType === 'daily' ? 'Previous' : chartType === 'weekly' ? 'Last Week' : 'Last Month'}</th>
                                <th>Avg</th>
                                <th>Threshold</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.roomEfficiency || []).map((r, i) => {
                                const effScore = r.prev_period && r.current_period ? ((r.prev_period - r.current_period) / r.prev_period * 100) : null;
                                return (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{r.room_name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.building_name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.block_name}</td>
                                        <td style={{ fontWeight: 600, color: r.current_period > r.threshold_kwh ? 'var(--danger)' : 'var(--text-primary)' }}>
                                            {r.current_period?.toFixed(1) || '—'}
                                        </td>
                                        <td>{r.prev_period?.toFixed(1) || '—'}</td>
                                        <td>{r.avg_period?.toFixed(1) || '—'}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{r.threshold_kwh} kWh</td>
                                        <td>
                                            <EfficiencyBadge today={r.current_period} yesterday={r.prev_period} lastWeekAvg={r.avg_period} threshold={r.threshold_kwh} />
                                            {effScore !== null && (
                                                <span className={`trend-badge-sm ${effScore > 0 ? 'down' : 'up'}`}>
                                                    {effScore > 0 ? `↓${effScore.toFixed(1)}%` : `↑${Math.abs(effScore).toFixed(1)}%`}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                onClick={() => openLogModal(r.room_id, r.room_name)}>
                                                <Eye size={13} /> View Log
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Room Log Modal */}
            {logModal.open && (
                <div className="modal-overlay" onClick={closeLogModal}>
                    <div className="modal modal-lg" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <div className="modal-title">Energy Logs — {logModal.roomName}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>All recorded consumption entries</div>
                            </div>
                            <button className="modal-close" onClick={closeLogModal}><X size={18} /></button>
                        </div>
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            {logsLoading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading logs...</div>
                            ) : roomLogs.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No logs found.</div>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Consumption (kWh)</th>
                                            <th>Building</th>
                                            <th>Block</th>
                                            <th>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roomLogs.map((log, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{log.date}</td>
                                                <td style={{ fontWeight: 600, color: '#6366F1' }}>{log.energy_consumption_kwh?.toFixed(2)} kWh</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{log.building_name}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{log.block_name}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{log.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
