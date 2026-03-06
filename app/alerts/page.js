'use client';
import { useState, useEffect } from 'react';
import { Bell, CircleCheck, Clock, AlertTriangle } from 'lucide-react';

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ room_id: '', message: '', sent_to: '', alert_type: 'manual' });
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        let isMounted = true;
        const loadAll = async () => {
            if (isMounted) setLoading(true);
            const [aRes, rRes] = await Promise.all([fetch('/api/alerts'), fetch('/api/rooms')]);
            if (isMounted) {
                setAlerts(await aRes.json());
                setRooms(await rRes.json());
                setLoading(false);
            }
        };
        loadAll();
        return () => { isMounted = false; };
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        const [aRes, rRes] = await Promise.all([fetch('/api/alerts'), fetch('/api/rooms')]);
        setAlerts(await aRes.json());
        setRooms(await rRes.json());
        setLoading(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Failed to send alert');
                setSaving(false);
                return;
            }
            setSaving(false);
            setShowModal(false);
            setForm({ room_id: '', message: '', sent_to: '', alert_type: 'manual' });
            fetchAll();
        } catch (err) {
            alert('Network error. Please try again.');
            setSaving(false);
        }
    };

    const updateStatus = async (id, status) => {
        await fetch(`/api/alerts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        fetchAll();
    };

    const deleteAlert = async (id) => {
        if (!confirm('Remove this alert?')) return;
        await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
        fetchAll();
    };

    const filtered = filterStatus ? alerts.filter(a => a.status === filterStatus) : alerts;
    const pendingCount = alerts.filter(a => a.status === 'pending').length;

    const statusBadge = (status) => {
        if (status === 'sent') return <span className="badge badge-success"><CircleCheck size={14} style={{ display: 'inline', marginRight: 4 }} /> Sent</span>;
        if (status === 'pending') return <span className="badge badge-warning"><Clock size={14} style={{ display: 'inline', marginRight: 4 }} /> Pending</span>;
        return <span className="badge badge-info">{status}</span>;
    };

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={28} /> Alerts & Notifications</h1>
                    <p className="page-desc">Shutdown alerts and abnormal consumption notifications</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Bell size={16} style={{ display: 'inline', marginRight: '6px' }} /> Send Alert</button>
            </div>

            {pendingCount > 0 && (
                <div className="alert-banner danger" style={{ marginBottom: 20 }}>
                    <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                    <div>
                        <div style={{ fontWeight: 600 }}>{pendingCount} Pending Alert{pendingCount > 1 ? 's' : ''}</div>
                        <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>These alerts require action or acknowledgment</div>
                    </div>
                </div>
            )}

            <div className="filters-bar">
                <div className="tabs" style={{ marginBottom: 0 }}>
                    {['', 'pending', 'sent'].map(s => (
                        <button key={s} className={`tab-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                            {s === '' ? `All (${alerts.length})` : s === 'pending' ? <><Clock size={14} style={{ display: 'inline', marginRight: 4 }} /> Pending (${pendingCount})</> : <><CircleCheck size={14} style={{ display: 'inline', marginRight: 4 }} /> Sent (${alerts.filter(a => a.status === 'sent').length})</>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading alerts...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon"><Bell size={40} /></div><div className="empty-text">No alerts found.</div></div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr><th>Time</th><th>Room</th><th>Building</th><th>Message</th><th>Sent To</th><th>Type</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {filtered.map(a => (
                                    <tr key={a.id}>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString()}</td>
                                        <td style={{ fontWeight: 600 }}>{a.room_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Campus-wide</span>}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{a.building_name || '—'}</td>
                                        <td style={{ maxWidth: 240, fontSize: 12 }}>{a.message}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.sent_to || '—'}</td>
                                        <td><span className={`badge ${a.alert_type === 'auto' ? 'badge-info' : 'badge-purple'}`}>{a.alert_type}</span></td>
                                        <td>{statusBadge(a.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {a.status === 'pending' && (
                                                    <button className="btn btn-success btn-sm" onClick={() => updateStatus(a.id, 'sent')}><CircleCheck size={14} style={{ display: 'inline' }} /> Mark Sent</button>
                                                )}
                                                <button className="btn btn-danger btn-sm" onClick={() => deleteAlert(a.id)}>Delete</button>
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
                            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={20} /> Send Shutdown Alert</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSend}>
                            <div className="form-group">
                                <label className="form-label">Room (optional)</label>
                                <select className="form-control" value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
                                    <option value="">Campus-wide alert</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.block_name} › {r.building_name} › {r.room_name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Alert Message *</label>
                                <textarea className="form-control" placeholder="Describe the issue and required action..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={3} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Send To (email/phone)</label>
                                <input className="form-control" placeholder="e.g. operator@campus.edu or +91-XXXXXXXXXX" value={form.sent_to} onChange={e => setForm({ ...form, sent_to: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Alert Type</label>
                                <select className="form-control" value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })}>
                                    <option value="manual">Manual Shutdown</option>
                                    <option value="auto">Auto-detected</option>
                                    <option value="warning">Warning</option>
                                </select>
                            </div>
                            <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--warning)', marginBottom: 8 }}>
                                <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> This alert will be logged and marked as sent. In production, this would trigger SMS/email delivery.
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Sending...' : <><Bell size={14} style={{ display: 'inline', marginRight: 6 }} /> Send Alert</>}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
