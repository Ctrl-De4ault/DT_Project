'use client';
import { useState, useEffect } from 'react';
import { Grid, Building2, DoorOpen } from 'lucide-react';

export default function BlocksPage() {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadBlocks = async () => {
            if (isMounted) setLoading(true);
            const res = await fetch('/api/blocks');
            if (isMounted) setBlocks(await res.json());
            if (isMounted) setLoading(false);
        };
        loadBlocks();
        return () => { isMounted = false; };
    }, []);

    const fetchBlocks = async () => {
        setLoading(true);
        const res = await fetch('/api/blocks');
        setBlocks(await res.json());
        setLoading(false);
    };

    const openAdd = () => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); };
    const openEdit = (b) => { setEditing(b); setForm({ name: b.name, description: b.description || '' }); setShowModal(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const url = editing ? `/api/blocks/${editing.id}` : '/api/blocks';
        const method = editing ? 'PUT' : 'POST';
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        setShowModal(false);
        fetchBlocks();
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete "${name}"? This will also delete all buildings and rooms in this block.`)) return;
        await fetch(`/api/blocks/${id}`, { method: 'DELETE' });
        fetchBlocks();
    };

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Grid size={28} /> Block Management</h1>
                    <p className="page-desc">Manage campus blocks — top-level infrastructure units</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Block</button>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading blocks...</div>
                ) : blocks.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon"><Grid size={40} /></div><div className="empty-text">No blocks yet. Add your first block.</div></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Block Name</th>
                                    <th>Description</th>
                                    <th>Buildings</th>
                                    <th>Rooms</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {blocks.map(b => (
                                    <tr key={b.id}>
                                        <td style={{ fontWeight: 700, fontSize: 15 }}>
                                            <span style={{ background: 'var(--accent-light)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: 6, display: 'inline-block' }}>{b.name}</span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{b.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                                        <td><span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Building2 size={12} /> {b.building_count}</span></td>
                                        <td><span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><DoorOpen size={12} /> {b.room_count}</span></td>
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
                            <h3 className="modal-title">{editing ? 'Edit Block' : 'Add New Block'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Block Name *</label>
                                <input className="form-control" placeholder="e.g. Block A" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-control" placeholder="Brief description of this block..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Block' : 'Add Block'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
