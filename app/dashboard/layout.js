import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { seedDatabase } from '@/lib/seed';
import { getDb } from '@/lib/mongodb';
import SidebarWrapper from '@/components/SidebarWrapper';

export default async function DashboardLayout({ children }) {
    let session;
    try {
        // Ensure DB + seed on every request (noop if already seeded)
        await seedDatabase();
        session = await getSession();
    } catch { }

    if (!session) redirect('/login');

    // Get pending alert count for sidebar badge
    let alertCount = 0;
    try {
        const db = await getDb();
        alertCount = await db.collection('alerts').countDocuments({ status: 'pending' });
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
