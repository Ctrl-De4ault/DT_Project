import { emptyAllData } from '@/lib/seed';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        emptyAllData();
        return NextResponse.json({ 
            success: true, 
            message: 'All data has been successfully cleared from the database.' 
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear data' },
            { status: 500 }
        );
    }
}
