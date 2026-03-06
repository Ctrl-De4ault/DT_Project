import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { seedDatabase } from '@/lib/seed';
import getDb from '@/lib/db';
import SidebarWrapper from '@/components/SidebarWrapper';

export default async function PagesLayout({ children }) {
    let session;
    let alertCount = 0;
    try {
        getDb(); seedDatabase();
        session = await getSession();
        const db = getDb();
        const result = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'pending'").get();
        alertCount = result?.count || 0;
    } catch { }
    if (!session) redirect('/login');
    return (
        <div className="page-layout">
            <SidebarWrapper user={session} alertCount={alertCount} />
            <div className="main-content">{children}</div>
        </div>
    );
}
