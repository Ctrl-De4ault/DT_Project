'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [tab, setTab] = useState('admin');
    const [email, setEmail] = useState('admin@campus.edu');
    const [password, setPassword] = useState('admin123');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Signup fields
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [campusCode, setCampusCode] = useState('');

    const handleTabSwitch = (t) => {
        setTab(t);
        setError('');
        setSuccess('');
        if (t === 'admin') { setEmail('admin@campus.edu'); setPassword('admin123'); }
        else if (t === 'user') { setEmail('user@campus.edu'); setPassword('user123'); }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Login failed'); return; }
            router.push('/dashboard');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: signupName,
                    email: signupEmail,
                    password: signupPassword,
                    campusCode: campusCode,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Signup failed'); return; }
            router.push('/dashboard');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg-grid" />
            <div className="login-bg-glow" />

            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#000000" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="login-app-name">OptiWatt</div>
                    <div className="login-app-sub">Campus Energy Management System</div>
                </div>

                <div className="login-tabs">
                    <button className={`login-tab ${tab === 'admin' ? 'active' : ''}`} onClick={() => handleTabSwitch('admin')}>
                        🛡️ Admin
                    </button>
                    <button className={`login-tab ${tab === 'user' ? 'active' : ''}`} onClick={() => handleTabSwitch('user')}>
                        👤 User
                    </button>
                    <button className={`login-tab ${tab === 'join' ? 'active' : ''}`} onClick={() => handleTabSwitch('join')}>
                        🔑 Join Campus
                    </button>
                </div>

                {error && <div className="error-msg">⚠️ {error}</div>}
                {success && <div className="success-msg" style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12, border: '1px solid #bbf7d0' }}>✓ {success}</div>}

                {/* Admin & User Login Form */}
                {(tab === 'admin' || tab === 'user') && (
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        <button className="login-btn" type="submit" disabled={loading}>
                            {loading ? <><span className="spinner" /> Signing in...</> : `Sign in as ${tab === 'admin' ? 'Administrator' : 'User'}`}
                        </button>
                    </form>
                )}

                {/* Join Campus Signup Form */}
                {tab === 'join' && (
                    <form onSubmit={handleSignup}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="form-control"
                                value={signupName}
                                onChange={e => setSignupName(e.target.value)}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                className="form-control"
                                value={signupEmail}
                                onChange={e => setSignupEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="form-control"
                                value={signupPassword}
                                onChange={e => setSignupPassword(e.target.value)}
                                placeholder="Create a password"
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Campus Code</label>
                            <input
                                type="text"
                                className="form-control"
                                value={campusCode}
                                onChange={e => setCampusCode(e.target.value.toUpperCase())}
                                placeholder="Enter the invite code (e.g. CAMPUS2024)"
                                required
                                style={{ letterSpacing: '1px', fontFamily: 'monospace' }}
                            />
                            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                                Ask your campus admin for the invite code
                            </div>
                        </div>
                        <button className="login-btn" type="submit" disabled={loading}>
                            {loading ? <><span className="spinner" /> Creating account...</> : 'Join Campus & Sign in'}
                        </button>
                    </form>
                )}

                <div className="login-hint">
                    {tab === 'join' ? (
                        <>
                            <div style={{ marginBottom: 6 }}>Default Campus Code:</div>
                            <div><code>CAMPUS2024</code></div>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 6 }}>Demo Credentials:</div>
                            <div>Admin: <code>admin@campus.edu</code> / <code>admin123</code></div>
                            <div style={{ marginTop: 3 }}>User: <code>user@campus.edu</code> / <code>user123</code></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
