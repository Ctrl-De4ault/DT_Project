import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { seedDatabase } from '@/lib/seed';
import getDb from '@/lib/db';
import SidebarWrapper from '@/components/SidebarWrapper';

export default async function DashboardLayout({ children }) {
    let session;
    try {
        // Ensure DB + seed on every request (noop if already seeded)
        seedDatabase();
        session = await getSession();
    } catch { }

    if (!session) redirect('/login');

    // Get pending alert count for sidebar badge
    let alertCount = 0;
    try {
        const db = getDb();
        const result = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'pending'").get();
        alertCount = result?.count || 0;
    } catch { }

    return (
        <div className="page-layout">
            <SidebarWrapper user={session} alertCount={alertCount} />
            <div className="main-content">
                {children}
            </div>
        </div>
    );
}
