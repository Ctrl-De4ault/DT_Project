'use client';
import { useState, useEffect } from 'react';
import { Shield, Plus, Copy, Check, X, Users, Key } from 'lucide-react';

export default function CampusCodesPage() {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [copied, setCopied] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user));
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        try {
            const res = await fetch('/api/campus-codes');
            const data = await res.json();
            setCodes(data.codes || []);
        } catch {
            console.error('Error fetching campus codes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCode = async (e) => {
        e.preventDefault();
        if (!newCode.trim()) return;

        setCreating(true);
        try {
            const res = await fetch('/api/campus-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: newCode.trim() }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                alert(data.error || 'Failed to create campus code');
                return;
            }
            
            setNewCode('');
            fetchCodes();
            alert('Campus code created successfully!');
        } catch (error) {
            alert('Error creating campus code');
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(''), 2000);
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column' }}>
                <Shield size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                <h2 style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Access Restricted</h2>
                <p style={{ color: 'var(--text-muted)' }}>This page is only available to administrators.</p>
            </div>
        );
    }

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Key size={28} /> Campus Codes
                    </h1>
                    <p className="page-desc">Manage campus invitation codes for user registration</p>
                </div>
            </div>

            {/* Create New Code */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Create New Campus Code
                    </div>
                </div>
                <form onSubmit={handleCreateCode} style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                        <label className="form-label">Campus Code</label>
                        <input
                            type="text"
                            className="form-control"
                            value={newCode}
                            onChange={e => setNewCode(e.target.value.toUpperCase())}
                            placeholder="Enter campus code (e.g., CAMPUS2024)"
                            style={{ letterSpacing: '1px', fontFamily: 'monospace', textTransform: 'uppercase' }}
                            minLength={4}
                            required
                        />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={creating || !newCode.trim()}>
                        {creating ? 'Creating...' : <><Plus size={16} style={{ display: 'inline', marginRight: 4 }} /> Create Code</>}
                    </button>
                </form>
            </div>

            {/* Active Codes */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Active Campus Codes
                    </div>
                </div>
                
                {loading ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading campus codes...
                    </div>
                ) : codes.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Key size={48} style={{ marginBottom: 16 }} />
                        <div>No campus codes created yet</div>
                        <div style={{ fontSize: 14, marginTop: 8 }}>Create your first campus code above to allow users to join</div>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Campus Code</th>
                                    <th>Status</th>
                                    <th>Created By</th>
                                    <th>Created Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {codes.map((code) => (
                                    <tr key={code.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <code style={{ 
                                                    background: 'var(--bg-tertiary)', 
                                                    padding: '4px 8px', 
                                                    borderRadius: 4,
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    letterSpacing: '1px'
                                                }}>
                                                    {code.code}
                                                </code>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${code.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                {code.is_active ? <><Check size={14} /> Active</> : <><X size={14} /> Inactive</>}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ 
                                                    width: 24, 
                                                    height: 24, 
                                                    background: 'var(--accent)', 
                                                    borderRadius: '50%', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    fontSize: 10, 
                                                    fontWeight: 700,
                                                    color: 'var(--bg-primary)'
                                                }}>
                                                    {code.created_by_name?.[0] || 'A'}
                                                </div>
                                                <span>{code.created_by_name || 'Admin'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                {new Date(code.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => copyToClipboard(code.code)}
                                                style={{ fontSize: 12 }}
                                            >
                                                {copied === code.code ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header">
                    <div className="card-title">How Campus Codes Work</div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                    <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)' }}>
                        <li style={{ marginBottom: 8 }}>Create a campus code using the form above</li>
                        <li style={{ marginBottom: 8 }}>Share the code with users who need to join your campus</li>
                        <li style={{ marginBottom: 8 }}>Users go to the login page and click &quot;Join Campus&quot;</li>
                        <li style={{ marginBottom: 8 }}>Users enter the code along with their details to create an account</li>
                        <li>New accounts are automatically created with &quot;user&quot; role</li>
                    </ol>
                    <div style={{ 
                        background: 'var(--info-light)', 
                        border: '1px solid rgba(59, 130, 246, 0.3)', 
                        borderRadius: 8, 
                        padding: '12px 16px', 
                        marginTop: 16, 
                        fontSize: 13, 
                        color: 'var(--info)' 
                    }}>
                        <strong>Default Codes:</strong> CAMPUS2024, ENERGY2024, OPTIWATT are pre-configured and ready to use.
                    </div>
                </div>
            </div>
        </div>
    );
}
