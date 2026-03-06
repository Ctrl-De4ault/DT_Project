'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

import {
    BarChart2,
    Grid,
    Building2,
    DoorOpen,
    Zap,
    ClipboardList,
    Bell,
    Users,
    Settings,
    Key
} from 'lucide-react';

const NAV_ITEMS = [
    {
        section: 'Overview', items: [
            { href: '/dashboard', icon: <BarChart2 size={18} />, label: 'Dashboard' },
        ]
    },
    {
        section: 'Infrastructure', adminOnly: true, items: [
            { href: '/blocks', icon: <Grid size={18} />, label: 'Blocks' },
            { href: '/buildings', icon: <Building2 size={18} />, label: 'Buildings' },
            { href: '/rooms', icon: <DoorOpen size={18} />, label: 'Rooms' },
        ]
    },
    {
        section: 'Data & Reports', items: [
            { href: '/energy-data', icon: <Zap size={18} />, label: 'Energy Data' },
            { href: '/reports', icon: <ClipboardList size={18} />, label: 'Reports' },
            { href: '/alerts', icon: <Bell size={18} />, label: 'Alerts', badge: true, adminOnly: true },
        ]
    },
    {
        section: 'Admin', adminOnly: true, items: [
            { href: '/users', icon: <Users size={18} />, label: 'Users', adminOnly: true },
            { href: '/campus-codes', icon: <Key size={18} />, label: 'Campus Codes' },
            { href: '/settings', icon: <Settings size={18} />, label: 'Settings' },
        ]
    },
];

export default function Sidebar({ user, alertCount = 0 }) {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Zap size={22} color="black" fill="black" />
                </div>
                <div className="sidebar-logo-text">
                    <div className="sidebar-logo-name">OptiWatt</div>
                    <div className="sidebar-logo-sub">Energy Tracker</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {NAV_ITEMS.map(section => {
                    if (section.adminOnly && user?.role !== 'admin') return null;
                    return (
                        <div className="sidebar-section" key={section.section}>
                            <div className="sidebar-section-title">{section.section}</div>
                            {section.items.map(item => {
                                if (item.adminOnly && user?.role !== 'admin') return null;
                                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                                    >
                                        <span className="sidebar-link-icon">{item.icon}</span>
                                        {item.label}
                                        {item.badge && alertCount > 0 && (
                                            <span className="sidebar-badge">{alertCount}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
                    <div className="sidebar-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.name || 'User'}</div>
                        <div className="sidebar-user-role">{user?.role || 'user'} · Sign out</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{loggingOut ? '...' : '→'}</span>
                </div>
            </div>
        </aside>
    );
}
