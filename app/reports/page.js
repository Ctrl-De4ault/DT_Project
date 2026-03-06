'use client';
import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { ClipboardList, Download, Printer, Calendar, CalendarRange, Bot, Zap, BarChart2, CircleAlert, CircleCheck, Trophy, ArrowUpCircle, TriangleAlert, Lightbulb, LineChart as LineChartIcon, Target, AlertTriangle, AlertCircle } from 'lucide-react';

const getInsightIcon = (iconStr) => {
    switch (iconStr) {
        case 'warning': return <AlertTriangle size={16} />;
        case 'alert': return <CircleAlert size={16} />;
        case 'success': return <CircleCheck size={16} />;
        case 'chart': return <LineChartIcon size={16} />;
        case 'bar': return <BarChart2 size={16} />;
        case 'tip': return <Lightbulb size={16} />;
        default: return <Target size={16} />;
    }
};


export default function ReportsPage() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState('daily');

    useEffect(() => {
        let isMounted = true;
        const loadReport = async () => {
            if (isMounted) setLoading(true);
            const res = await fetch(`/api/reports?type=${type}`);
            if (isMounted) setReport(await res.json());
            if (isMounted) setLoading(false);
        };
        loadReport();
        return () => { isMounted = false; };
    }, [type]);

    const handleExportCSV = () => {
        if (!report) return;
        const rows = [
            ['Room', 'Building', 'Block', 'Total kWh', 'Avg kWh', 'Threshold', 'Status'],
            ...(report.top_rooms || []).map(r => [
                r.room_name, r.building_name, r.block_name,
                r.total_kwh.toFixed(2), r.avg_kwh.toFixed(2), r.threshold_kwh,
                r.avg_kwh > r.threshold_kwh ? 'Inefficient' : 'OK'
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `optiwatt-report-${type}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleExportPDF = () => {
        window.print();
    };

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={28} /> AI Energy Reports</h1>
                    <p className="page-desc">Intelligent energy analysis and recommendations</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}><Download size={16} /> Export CSV</button>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportPDF}><Printer size={16} /> Print/PDF</button>
                </div>
            </div>

            <div className="tabs">
                {[
                    { key: 'daily', label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} /> Daily Report</span> },
                    { key: 'monthly', label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarRange size={16} /> Monthly Report</span> },
                ].map(t => (
                    <button key={t.key} className={`tab-btn ${type === t.key ? 'active' : ''}`} onClick={() => setType(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: 16 }}><Bot size={36} className="loading" /></div>
                    Generating AI insights...
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="kpi-grid" style={{ marginBottom: 20 }}>
                        <div className="kpi-card accent">
                            <div className="kpi-icon"><Zap size={24} /></div>
                            <div className="kpi-value">{parseFloat(report?.summary?.total_kwh || 0).toFixed(0)}</div>
                            <div className="kpi-label">Total kWh</div>
                        </div>
                        <div className="kpi-card success">
                            <div className="kpi-icon"><BarChart2 size={24} /></div>
                            <div className="kpi-value">{report?.summary?.avg_kwh || '0'}</div>
                            <div className="kpi-label">Avg kWh / Room</div>
                        </div>
                        <div className="kpi-card danger">
                            <div className="kpi-icon"><AlertCircle size={24} /></div>
                            <div className="kpi-value">{report?.summary?.rooms_above_threshold || 0}</div>
                            <div className="kpi-label">Inefficient Rooms</div>
                        </div>
                        <div className="kpi-card warning">
                            <div className="kpi-icon"><CircleCheck size={24} /></div>
                            <div className="kpi-value">{report?.summary?.rooms_efficient || 0}</div>
                            <div className="kpi-label">Efficient Rooms</div>
                        </div>
                    </div>

                    <div className="charts-row">
                        {/* AI Insights */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bot size={18} /> AI Insights</div>
                                <div className="card-subtitle">{report?.insights?.length || 0} findings</div>
                            </div>
                            {(report?.insights || []).length === 0 ? (
                                <div className="empty-state"><div className="empty-icon"><CircleCheck size={40} /></div><div className="empty-text">No issues detected</div></div>
                            ) : (
                                <div>
                                    {(report?.insights || []).map((ins, i) => (
                                        <div key={i} className={`insight-card ${ins.type}`}>
                                            <span className="insight-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInsightIcon(ins.icon)}</span>
                                            <span className="insight-text">{ins.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Block Ranking */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={18} /> Block Efficiency Ranking</div>
                                <div className="card-subtitle">Avg kWh per room (lower is better)</div>
                            </div>
                            <div style={{ height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={report?.block_ranking || []} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="block" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} width={60} />
                                        <Tooltip formatter={(v) => [`${v.toFixed(2)} kWh`]} contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
                                        <Bar dataKey="avg_per_room" name="Avg kWh" radius={[0, 4, 4, 0]}>
                                            {(report?.block_ranking || []).map((_, i) => (
                                                <Cell key={i} fill={['#10B981', '#4F46E5', '#F59E0B'][i % 3]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {(report?.block_ranking || []).map((b, i) => (
                                <div className="stat-row" key={i}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: ['#10B981', '#4F46E5', '#F59E0B'][i % 3], fontWeight: 700 }}>#{i + 1}</span>
                                        <span className="stat-label">{b.block}</span>
                                    </div>
                                    <span className="stat-value">{b.avg_per_room?.toFixed(2)} kWh avg</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Consuming Rooms */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowUpCircle size={18} /> Top Energy Consuming Rooms</div>
                        </div>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr><th>#</th><th>Room</th><th>Building</th><th>Block</th><th>Total kWh</th><th>Avg kWh/Day</th><th>Threshold</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {(report?.top_rooms || []).map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#{i + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{r.room_name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{r.building_name}</td>
                                            <td><span className="badge badge-purple">{r.block_name}</span></td>
                                            <td style={{ fontWeight: 700 }}>{r.total_kwh.toFixed(2)}</td>
                                            <td>{r.avg_kwh.toFixed(2)}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{r.threshold_kwh}</td>
                                            <td>
                                                {r.avg_kwh > r.threshold_kwh ? (
                                                    <span className="badge badge-danger"><CircleAlert size={14} /> Inefficient</span>
                                                ) : r.avg_kwh < r.threshold_kwh * 0.7 ? (
                                                    <span className="badge badge-success"><CircleCheck size={14} /> Efficient</span>
                                                ) : (
                                                    <span className="badge badge-warning"><TriangleAlert size={14} /> Moderate</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
