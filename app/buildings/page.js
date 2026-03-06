'use client';
import { useState, useEffect } from 'react';
import { Building2, Grid, DoorOpen } from 'lucide-react';

export default function BuildingsPage() {
    const [buildings, setBuildings] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', block_id: '' });
    const [saving, setSaving] = useState(false);
    const [filterBlock, setFilterBlock] = useState('');

    useEffect(() => {
        let isMounted = true;
        const loadAll = async () => {
            if (isMounted) setLoading(true);
            const [bRes, blRes] = await Promise.all([fetch('/api/buildings'), fetch('/api/blocks')]);
            if (isMounted) {
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
        const [bRes, blRes] = await Promise.all([fetch('/api/buildings'), fetch('/api/blocks')]);
        setBuildings(await bRes.json());
        setBlocks(await blRes.json());
        setLoading(false);
    };

    const openAdd = () => { setEditing(null); setForm({ name: '', block_id: blocks[0]?.id || '' }); setShowModal(true); };
    const openEdit = (b) => { setEditing(b); setForm({ name: b.name, block_id: b.block_id }); setShowModal(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const url = editing ? `/api/buildings/${editing.id}` : '/api/buildings';
        const method = editing ? 'PUT' : 'POST';
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        setShowModal(false);
        fetchAll();
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete "${name}"? All rooms in this building will also be deleted.`)) return;
        await fetch(`/api/buildings/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const filtered = filterBlock ? buildings.filter(b => String(b.block_id) === filterBlock) : buildings;

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={28} /> Building Management</h1>
                    <p className="page-desc">Manage buildings within campus blocks</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Building</button>
            </div>

            <div className="filters-bar">
                <select className="form-control" style={{ width: 180 }} value={filterBlock} onChange={e => setFilterBlock(e.target.value)}>
                    <option value="">All Blocks</option>
                    {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} buildings</span>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading buildings...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon"><Building2 size={40} /></div><div className="empty-text">No buildings found.</div></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr><th>Building Name</th><th>Block</th><th>Rooms</th><th>Created</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map(b => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 600 }}>{b.name}</td>
                                        <td><span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Grid size={12} /> {b.block_name}</span></td>
                                        <td><span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><DoorOpen size={12} /> {b.room_count}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(b.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>Edit</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id, b.name)}>Delete</button>
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
                            <h3 className="modal-title">{editing ? 'Edit Building' : 'Add Building'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Building Name *</label>
                                <input className="form-control" placeholder="e.g. Building A1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Block *</label>
                                <select className="form-control" value={form.block_id} onChange={e => setForm({ ...form, block_id: e.target.value })} required>
                                    <option value="">Select Block</option>
                                    {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Building'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
