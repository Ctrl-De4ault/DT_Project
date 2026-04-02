import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/mongodb';
import SidebarWrapper from '@/components/SidebarWrapper';

export default async function PagesLayout({ children }) {
    let session;
    let alertCount = 0;
    try {
        const db = await getDb();
        session = await getSession();
        if (db) {
            alertCount = await db.collection('alerts').countDocuments({ status: 'pending' });
        }
    } catch (err) {
        console.error('Layout error:', err);
    }

    return (
        <div className="page-layout">
            <SidebarWrapper user={session} alertCount={alertCount} />
            <div className="main-content">{children}</div>
        </div>
    );
}
