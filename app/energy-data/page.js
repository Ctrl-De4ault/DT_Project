'use client';
import { useState, useEffect, useRef } from 'react';
import { CircleCheck, Zap, FileEdit, Upload, ClipboardList, Plus, Calendar } from 'lucide-react';

export default function EnergyDataPage() {
    const [data, setData] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('upload');
    const [form, setForm] = useState({ room_id: '', date: new Date().toISOString().split('T')[0], energy_consumption_kwh: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [csvRows, setCsvRows] = useState([]);
    const [csvPreview, setCsvPreview] = useState(false);
    const [filterBlock, setFilterBlock] = useState('');
    const [filterBuilding, setFilterBuilding] = useState('');
    const fileRef = useRef();

    useEffect(() => {
        let isMounted = true;
        const loadAll = async () => {
            if (isMounted) setLoading(true);
            const params = new URLSearchParams();
            if (filterBlock) params.append('block_id', filterBlock);
            if (filterBuilding) params.append('building_id', filterBuilding);
            const [dRes, rRes, blRes, bRes] = await Promise.all([
                fetch(`/api/energy-data?${params}&limit=100`),
                fetch('/api/rooms'), fetch('/api/blocks'), fetch('/api/buildings')
            ]);
            if (isMounted) {
                setData(await dRes.json());
                setRooms(await rRes.json());
                setBlocks(await blRes.json());
                setBuildings(await bRes.json());
                setLoading(false);
            }
        };
        loadAll();
        return () => { isMounted = false; };
    }, [filterBlock, filterBuilding]);

    const fetchAll = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterBlock) params.append('block_id', filterBlock);
        if (filterBuilding) params.append('building_id', filterBuilding);
        const [dRes, rRes, blRes, bRes] = await Promise.all([
            fetch(`/api/energy-data?${params}&limit=100`),
            fetch('/api/rooms'), fetch('/api/blocks'), fetch('/api/buildings')
        ]);
        setData(await dRes.json());
        setRooms(await rRes.json());
        setBlocks(await blRes.json());
        setBuildings(await bRes.json());
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccess('');
        const res = await fetch('/api/energy-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            setSuccess(<> <CircleCheck size={16} style={{ display: 'inline', verticalAlign: 'sub' }} /> Energy data recorded successfully! </>);
            setForm(f => ({ ...f, energy_consumption_kwh: '', notes: '' }));
            fetchAll();
        }
        setSaving(false);
    };

    const handleCsvUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const lines = text.trim().split('\n').slice(1); // skip header
        const rows = lines.map(line => {
            const parts = line.split(',');
            return {
                room_id: parts[0]?.trim(),
                date: parts[1]?.trim(),
                energy_consumption_kwh: parseFloat(parts[2]?.trim()),
                notes: parts[3]?.trim() || '',
            };
        }).filter(r => r.room_id && r.date && !isNaN(r.energy_consumption_kwh));
        setCsvRows(rows);
        setCsvPreview(true);
    };

    const handleCsvSubmit = async () => {
        setSaving(true);
        const res = await fetch('/api/energy-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(csvRows),
        });
        if (res.ok) {
            const result = await res.json();
            setSuccess(<> <CircleCheck size={16} style={{ display: 'inline', verticalAlign: 'sub' }} /> Uploaded {result.inserted} records successfully! </>);
            setCsvPreview(false);
            setCsvRows([]);
            if (fileRef.current) fileRef.current.value = '';
            fetchAll();
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this energy record?')) return;
        await fetch(`/api/energy-data?id=${id}`, { method: 'DELETE' });
        fetchAll();
    };

    // Quick log function for today's energy
    const handleQuickLog = async (roomId, kWh) => {
        setSaving(true);
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch('/api/energy-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_id: roomId,
                date: today,
                energy_consumption_kwh: kWh,
                notes: 'Quick log entry'
            }),
        });
        if (res.ok) {
            setSuccess(<> <CircleCheck size={16} style={{ display: 'inline', verticalAlign: 'sub' }} /> Quick log added successfully! </>);
            fetchAll();
        }
        setSaving(false);
    };

    const filteredBuildings = filterBlock ? buildings.filter(b => String(b.block_id) === filterBlock) : buildings;

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={28} /> Energy Data</h1>
                    <p className="page-desc">Upload and manage daily energy consumption records</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setTab('upload')}>
                        <Plus size={16} style={{ display: 'inline', marginRight: 4 }} /> Quick Log
                    </button>
                </div>
            </div>

            <div className="tabs">
                {['upload', 'csv', 'history'].map(t => (
                    <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                        {t === 'upload' ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileEdit size={16} /> Manual Entry</span> : t === 'csv' ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={16} /> CSV Upload</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={16} /> History</span>}
                    </button>
                ))}
            </div>

            {success && <div style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13 }}>{success}</div>}

            {tab === 'upload' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileEdit size={18} /> Log Daily Energy Usage</div>
                    </div>
                    
                    {/* Quick Log Section */}
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Calendar size={16} style={{ color: 'var(--accent)' }} />
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Quick Log for Today</h3>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            Quickly add energy consumption for today without filling the full form
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                            {rooms.slice(0, 6).map(room => (
                                <button
                                    key={room.id}
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleQuickLog(room.id, 50)}
                                    disabled={saving}
                                    style={{ fontSize: 11, padding: '8px 12px' }}
                                >
                                    <Plus size={12} style={{ display: 'inline', marginRight: 4 }} />
                                    {room.room_name} (50kWh)
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Room *</label>
                                <select className="form-control" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} required>
                                    <option value="">Select Room</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.block_name} › {r.building_name} › {r.room_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Energy Consumption (kWh) *</label>
                                <input type="number" step="0.01" min="0" className="form-control" placeholder="e.g. 45.5" value={form.energy_consumption_kwh} onChange={e => setForm({ ...form, energy_consumption_kwh: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes (optional)</label>
                                <input className="form-control" placeholder="Any observations..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : <><Zap size={16} /> Record Energy Data</>}</button>
                    </form>
                </div>
            )}

            {tab === 'csv' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Upload size={18} /> CSV Bulk Upload</div>
                    </div>
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16, marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: 6, color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Expected CSV format:</div>
                        room_id,date,energy_consumption_kwh,notes<br />
                        1,2024-01-15,45.5,Normal day<br />
                        2,2024-01-15,38.2,
                    </div>
                    <input ref={fileRef} type="file" accept=".csv" className="form-control" onChange={handleCsvUpload} style={{ marginBottom: 16 }} />
                    {csvPreview && csvRows.length > 0 && (
                        <div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Preview: {csvRows.length} records to upload</div>
                            <div className="table-wrapper" style={{ maxHeight: 200, overflow: 'auto', marginBottom: 16 }}>
                                <table className="table">
                                    <thead><tr><th>Room ID</th><th>Date</th><th>kWh</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        {csvRows.slice(0, 10).map((r, i) => (
                                            <tr key={i}><td>{r.room_id}</td><td>{r.date}</td><td>{r.energy_consumption_kwh}</td><td>{r.notes || '—'}</td></tr>
                                        ))}
                                        {csvRows.length > 10 && <tr><td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>... and {csvRows.length - 10} more</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <button className="btn btn-primary" onClick={handleCsvSubmit} disabled={saving}>
                                {saving ? 'Uploading...' : <><Upload size={16} /> Upload {csvRows.length} Records</>}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {tab === 'history' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={18} /> Upload History</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="form-control" style={{ width: 140, padding: '5px 10px', fontSize: 12 }} value={filterBlock} onChange={e => { setFilterBlock(e.target.value); setFilterBuilding(''); }}>
                                <option value="">All Blocks</option>
                                {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <select className="form-control" style={{ width: 160, padding: '5px 10px', fontSize: 12 }} value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}>
                                <option value="">All Buildings</option>
                                {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr><th>Date</th><th>Room</th><th>Building</th><th>Block</th><th>kWh</th><th>Sensor</th><th>Uploaded By</th><th>Notes</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {loading ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr> :
                                    data.map(d => (
                                        <tr key={d.id}>
                                            <td style={{ fontWeight: 500 }}>{d.date}</td>
                                            <td style={{ fontWeight: 600 }}>{d.room_name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{d.building_name}</td>
                                            <td><span className="badge badge-purple">{d.block_name}</span></td>
                                            <td style={{ fontWeight: 700, color: d.energy_consumption_kwh > (d.threshold_kwh || 50) ? 'var(--danger)' : 'var(--success)' }}>
                                                {d.energy_consumption_kwh}
                                            </td>
                                            <td><code style={{ fontSize: 11, background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>{d.sensor_id || '—'}</code></td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{d.uploaded_by_name || 'System'}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.notes || '—'}</td>
                                            <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}>Delete</button></td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
