import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import SidebarWrapper from '@/components/SidebarWrapper';

export default async function SharedLayout({ children }) {
    let session, alertCount = 0;
    try {
        const db = await getDb();
        session = await getSession();
        alertCount = await db.collection('alerts').countDocuments({ status: 'pending' });
    } catch { }
    if (!session) redirect('/login');
    return (
        <div className="page-layout">
            <SidebarWrapper user={session} alertCount={alertCount} />
            <div className="main-content">{children}</div>
        </div>
    );
}
