import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { seedDatabase } from '@/lib/seed';
import { getDb } from '@/lib/mongodb';
import SidebarWrapper from '@/components/SidebarWrapper';

export default async function PagesLayout({ children }) {
    let session;
    let alertCount = 0;
    try {
        await seedDatabase();
        session = await getSession();
        const db = await getDb();
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
