'use client';
import Sidebar from './Sidebar';

export default function SidebarWrapper({ user, alertCount }) {
    return <Sidebar user={user} alertCount={alertCount} />;
}
