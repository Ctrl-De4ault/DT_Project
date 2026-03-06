'use client';
import { useState, useEffect } from 'react';
import { Settings, User, Shield, Globe, BarChart2, Bell, Lightbulb, Trash, Building } from 'lucide-react';

export default function SettingsPage() {
    const [user, setUser] = useState(null);
    const [clearing, setClearing] = useState(false);
    const [clearingInfra, setClearingInfra] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user));
    }, []);

    const handleClearAllData = async () => {
        if (!confirm('⚠️ WARNING: This will permanently delete ALL data including:\n\n• All users\n• All blocks, buildings, and rooms\n• All energy consumption records\n• All alerts\n• All system data\n\nThis action cannot be undone. Are you absolutely sure?')) {
            return;
        }

        if (!confirm('🚨 FINAL CONFIRMATION: All data will be permanently erased. The system will need to be reseeded to function. Continue?')) {
            return;
        }

        setClearing(true);
        try {
            const response = await fetch('/api/clear-data', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                alert('✅ All data has been successfully cleared. The system will need to be reseeded.');
                // Optionally redirect to login page since all users are deleted
                window.location.href = '/login';
            } else {
                alert('❌ Failed to clear data: ' + result.error);
            }
        } catch (error) {
            alert('❌ Error clearing data: ' + error.message);
        } finally {
            setClearing(false);
        }
    };

    const handleClearInfrastructureData = async () => {
        if (!confirm('⚠️ WARNING: This will permanently delete all infrastructure data:\n\n• All blocks, buildings, and rooms\n• All energy consumption records\n• All alerts\n• All system configuration\n\nUser accounts will be preserved. This action cannot be undone. Are you sure?')) {
            return;
        }

        setClearingInfra(true);
        try {
            const response = await fetch('/api/clear-infrastructure', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                alert('✅ Infrastructure data has been successfully cleared. User accounts preserved.');
                // Refresh the page to show updated state
                window.location.reload();
            } else {
                alert('❌ Failed to clear infrastructure data: ' + result.error);
            }
        } catch (error) {
            alert('❌ Error clearing infrastructure data: ' + error.message);
        } finally {
            setClearingInfra(false);
        }
    };

    return (
        <div className="page-content" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={28} /> Settings</h1>
                    <p className="page-desc">System configuration and preferences</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
                <div className="card">
                    <div className="card-header"><div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18} /> Your Profile</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 56, height: 56, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--bg-primary)' }}>
                                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name || '...'}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</div>
                            </div>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Role</span>
                            <span className={`badge ${user?.role === 'admin' ? 'badge-purple' : 'badge-info'}`}>{user?.role === 'admin' ? <><Shield size={14} /> Admin</> : <><User size={14} /> User</>}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Phone</span>
                            <span className="stat-value">{user?.phone || '—'}</span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={18} /> System Info</div></div>
                    {[
                        ['Platform', 'OptiWatt — Campus Energy Management System'],
                        ['Version', 'v1.0.0'],
                        ['Database', 'SQLite (campus_energy.db)'],
                        ['Auth', 'JWT (24hr session)'],
                        ['Charts', 'Recharts'],
                        ['Framework', 'Next.js 14 App Router'],
                    ].map(([label, value]) => (
                        <div className="stat-row" key={label}>
                            <span className="stat-label">{label}</span>
                            <span className="stat-value" style={{ fontSize: 12 }}>{value}</span>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header"><div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={18} /> Default Thresholds</div></div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Default energy limits used for efficiency calculations</p>
                    {[
                        ['Standard Room', '50 kWh/day'],
                        ['Large Classroom', '70 kWh/day'],
                        ['Lab / Computer Room', '90 kWh/day'],
                        ['Sports Facility', '120 kWh/day'],
                    ].map(([label, value]) => (
                        <div className="stat-row" key={label}>
                            <span className="stat-label">{label}</span>
                            <span className="stat-value" style={{ color: 'var(--warning)' }}>{value}</span>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header"><div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} /> Alert Configuration</div></div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Alert delivery configuration</p>
                    {[
                        ['SMS Alerts', 'Simulated (logged to DB)'],
                        ['Email Alerts', 'Simulated (logged to DB)'],
                        ['Auto-detect', 'Threshold breach triggers'],
                        ['Cooldown Period', '24 hours between alerts'],
                    ].map(([label, value]) => (
                        <div className="stat-row" key={label}>
                            <span className="stat-label">{label}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>
                        </div>
                    ))}
                    <div style={{ background: 'var(--info-light)', borderRadius: 8, padding: '10px 12px', marginTop: 12, fontSize: 13, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lightbulb size={20} /> In production, integrate with Twilio (SMS) and SendGrid (email) for real delivery.
                    </div>
                </div>

                {/* Admin-only section */}
                {user?.role === 'admin' && (
                    <div className="card" style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                        <div className="card-header">
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                                <Trash size={18} /> System Administration
                            </div>
                        </div>

                        {/* Clear Infrastructure Data Section */}
                        <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 8px 0', color: 'var(--warning)', fontSize: 14, fontWeight: 600 }}>🏢 Clear Infrastructure Data</h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--warning)' }}>
                                This action will delete all campus infrastructure data but preserve user accounts.
                            </p>
                            <ul style={{ margin: '0 0 12px 0', paddingLeft: 20, fontSize: 11, color: 'var(--warning)' }}>
                                <li>All blocks, buildings, and rooms</li>
                                <li>All energy consumption history</li>
                                <li>All alerts and notifications</li>
                                <li>✅ User accounts will be preserved</li>
                            </ul>
                            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                                ⚠️ Infrastructure data will need to be reseeded to restore campus structure.
                            </p>
                            <button
                                className="btn btn-warning"
                                onClick={handleClearInfrastructureData}
                                disabled={clearingInfra}
                                style={{ width: '100%' }}
                            >
                                {clearingInfra ? (
                                    <>Clearing infrastructure data...</>
                                ) : (
                                    <><Building size={16} style={{ display: 'inline', marginRight: 6 }} /> Clear Infrastructure Data</>
                                )}
                            </button>
                        </div>

                        {/* Clear All Data Section */}
                        <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 8px 0', color: 'var(--danger)', fontSize: 14, fontWeight: 600 }}>⚠️ Danger Zone</h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--danger)' }}>
                                This action will permanently delete ALL data from the system. This includes users, energy records, alerts, and all configuration data.
                            </p>
                            <ul style={{ margin: '0 0 12px 0', paddingLeft: 20, fontSize: 11, color: 'var(--danger)' }}>
                                <li>All user accounts (including admin)</li>
                                <li>All blocks, buildings, and rooms</li>
                                <li>All energy consumption history</li>
                                <li>All alerts and notifications</li>
                                <li>All system configuration data</li>
                            </ul>
                            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                                ⚠️ This action is <strong>IRREVERSIBLE</strong> and will require reseeding the database to restore functionality.
                            </p>
                            <button
                                className="btn btn-danger"
                                onClick={handleClearAllData}
                                disabled={clearing}
                                style={{ width: '100%' }}
                            >
                                {clearing ? (
                                    <>Clearing all data...</>
                                ) : (
                                    <><Trash size={16} style={{ display: 'inline', marginRight: 6 }} /> Clear All Data</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
