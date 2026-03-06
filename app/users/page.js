'use client';
import { useState, useEffect } from 'react';
import { Users, Shield, User, KeyRound, Copy, Plus, Check } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', phone: '' });
    const [saving, setSaving] = useState(false);

    // Campus codes
    const [codes, setCodes] = useState([]);
    const [codesLoading, setCodesLoading] = useState(true);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const loadUsers = async () => {
            if (isMounted) setLoading(true);
            const res = await fetch('/api/users');
            if (isMounted) {
                if (res.ok) setUsers(await res.json());
                else setUsers([]);
                setLoading(false);
            }
        };
        const loadCodes = async () => {
            if (isMounted) setCodesLoading(true);
            const res = await fetch('/api/campus-code');
            if (isMounted) {
                if (res.ok) setCodes(await res.json());
                else setCodes([]);
                setCodesLoading(false);
            }
        };
        loadUsers();
        loadCodes();
        return () => { isMounted = false; };
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const res = await fetch('/api/users');
        if (res.ok) setUsers(await res.json());
        else setUsers([]);
        setLoading(false);
    };

    const fetchCodes = async () => {
        setCodesLoading(true);
        const res = await fetch('/api/campus-code');
        if (res.ok) setCodes(await res.json());
        else setCodes([]);
        setCodesLoading(false);
    };

    const handleGenerateCode = async () => {
        setGeneratingCode(true);
        const res = await fetch('/api/campus-code', { method: 'POST' });
        if (res.ok) fetchCodes();
        setGeneratingCode(false);
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const openAdd = () => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'user', phone: '' }); setShowModal(true); };
    const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' }); setShowModal(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const url = editing ? `/api/users/${editing.id}` : '/api/users';
        const method = editing ? 'PUT' : 'POST';
        const body = { ...form };
        if (editing && !body.password) delete body.password;
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) { const d = await res.json(); alert(d.error); }
        setSaving(false);
        setShowModal(false);
        fetchUsers();
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete user "${name}"?`)) return;
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        fetchUsers();
    };

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={28} /> User Management</h1>
                    <p className="page-desc">Manage campus system users and access roles</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add User</button>
            </div>

            {/* Campus Codes Section */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <KeyRound size={18} /> Campus Invite Codes
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleGenerateCode} disabled={generatingCode} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={14} /> {generatingCode ? 'Generating...' : 'Generate Code'}
                    </button>
                </div>
                <div style={{ padding: '0 20px 16px' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                        Share these codes with users so they can register via the &quot;Join Campus&quot; tab on the login page.
                    </p>
                    {codesLoading ? (
                        <div style={{ color: 'var(--text-muted)', padding: '12px 0' }}>Loading codes...</div>
                    ) : codes.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', padding: '12px 0' }}>No codes yet. Generate one above.</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {codes.map(c => (
                                <div key={c.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: c.is_active ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8, padding: '10px 14px',
                                    opacity: c.is_active ? 1 : 0.5,
                                }}>
                                    <code style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{c.code}</code>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleCopyCode(c.code)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
                                    >
                                        {copiedCode === c.code ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading users...</td></tr>
                            ) : users.map(u => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, background: u.role === 'admin' ? 'var(--accent)' : 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, color: u.role === 'admin' ? 'var(--bg-primary)' : 'white' }}>
                                                {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            {u.name}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                                    <td>
                                        <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-info'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            {u.role === 'admin' ? <><Shield size={12} /> Admin</> : <><User size={12} /> User</>}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.phone || '—'}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Edit User' : 'Add User'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-control" placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input type="email" className="form-control" placeholder="user@campus.edu" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                                    <input type="password" className="form-control" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-control" placeholder="+91-XXXXXXXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update User' : 'Add User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
