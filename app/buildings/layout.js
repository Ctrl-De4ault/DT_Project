import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import getDb from '@/lib/db';
import SidebarWrapper from '@/components/SidebarWrapper';

export default async function SharedLayout({ children }) {
    let session, alertCount = 0;
    try {
        const db = getDb();
        session = await getSession();
        const result = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE status = 'pending'").get();
        alertCount = result?.count || 0;
    } catch { }

    return (
        <div className="page-layout">
            <SidebarWrapper user={session} alertCount={alertCount} />
            <div className="main-content">{children}</div>
        </div>
    );
}
