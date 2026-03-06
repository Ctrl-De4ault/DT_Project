'use client';
import { useState, useEffect } from 'react';
import { DoorOpen, Grid } from 'lucide-react';

export default function RoomsPage() {
    const [rooms, setRooms] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ room_name: '', building_id: '', sensor_id: '', capacity: 30, threshold_kwh: 50 });
    const [saving, setSaving] = useState(false);
    const [filterBuilding, setFilterBuilding] = useState('');
    const [filterBlock, setFilterBlock] = useState('');

    useEffect(() => {
        let isMounted = true;
        const loadAll = async () => {
            if (isMounted) setLoading(true);
            const [rRes, bRes, blRes] = await Promise.all([fetch('/api/rooms'), fetch('/api/buildings'), fetch('/api/blocks')]);
            if (isMounted) {
                setRooms(await rRes.json());
                setBuildings(await bRes.json());
                setBlocks(await blRes.json());
                setLoading(false);
            }
        };
        loadAll();
        return () => { isMounted = false; };
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        const [rRes, bRes, blRes] = await Promise.all([fetch('/api/rooms'), fetch('/api/buildings'), fetch('/api/blocks')]);
        setRooms(await rRes.json());
        setBuildings(await bRes.json());
        setBlocks(await blRes.json());
        setLoading(false);
    };

    const openAdd = () => { setEditing(null); setForm({ room_name: '', building_id: '', sensor_id: '', capacity: 30, threshold_kwh: 50 }); setShowModal(true); };
    const openEdit = (r) => { setEditing(r); setForm({ room_name: r.room_name, building_id: r.building_id, sensor_id: r.sensor_id || '', capacity: r.capacity, threshold_kwh: r.threshold_kwh }); setShowModal(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const url = editing ? `/api/rooms/${editing.id}` : '/api/rooms';
        const method = editing ? 'PUT' : 'POST';
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        setShowModal(false);
        fetchAll();
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete "${name}"?`)) return;
        await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const filteredBuildings = filterBlock ? buildings.filter(b => String(b.block_id) === filterBlock) : buildings;
    const filtered = rooms.filter(r => {
        if (filterBlock && String(r.block_id) !== filterBlock) return false;
        if (filterBuilding && String(r.building_id) !== filterBuilding) return false;
        return true;
    });

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DoorOpen size={28} /> Room Management</h1>
                    <p className="page-desc">Manage rooms with IoT sensor assignments</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Room</button>
            </div>

            <div className="filters-bar">
                <select className="form-control" style={{ width: 160 }} value={filterBlock} onChange={e => { setFilterBlock(e.target.value); setFilterBuilding(''); }}>
                    <option value="">All Blocks</option>
                    {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select className="form-control" style={{ width: 180 }} value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)}>
                    <option value="">All Buildings</option>
                    {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} rooms</span>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading rooms...</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr><th>Room</th><th>Building</th><th>Block</th><th>Sensor ID</th><th>Capacity</th><th>Threshold</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 600 }}>{r.room_name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.building_name}</td>
                                        <td><span className="badge badge-purple" style={{ display: 'inline', alignItems: 'center', gap: '4px' }}><Grid size={12} /> {r.block_name}</span></td>
                                        <td><code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{r.sensor_id || '—'}</code></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{r.capacity} pax</td>
                                        <td><span style={{ color: 'var(--warning)', fontWeight: 600 }}>{r.threshold_kwh} kWh</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id, r.room_name)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit Room' : 'Add Room'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Room Name *</label>
                                    <input className="form-control" placeholder="e.g. Room 101" value={form.room_name} onChange={e => setForm({ ...form, room_name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Building *</label>
                                    <select className="form-control" value={form.building_id} onChange={e => setForm({ ...form, building_id: e.target.value })} required>
                                        <option value="">Select Building</option>
                                        {buildings.map(b => <option key={b.id} value={b.id}>{b.block_name} › {b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Sensor ID</label>
                                    <input className="form-control" placeholder="e.g. SEN-A1-101" value={form.sensor_id} onChange={e => setForm({ ...form, sensor_id: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Capacity (persons)</label>
                                    <input className="form-control" type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Energy Threshold (kWh/day)</label>
                                <input className="form-control" type="number" min="1" step="0.5" value={form.threshold_kwh} onChange={e => setForm({ ...form, threshold_kwh: e.target.value })} />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Alert will be sent when daily consumption exceeds this value</div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Room' : 'Add Room'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
