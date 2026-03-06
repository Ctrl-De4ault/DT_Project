import { emptyAllData } from '@/lib/seed';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        emptyAllData();
        return NextResponse.json({ 
            success: true, 
            message: 'Infrastructure data (blocks, buildings, rooms, energy data, alerts) has been successfully cleared. User accounts preserved.' 
        });
    } catch (error) {
        console.error('Error clearing infrastructure data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear infrastructure data' },
            { status: 500 }
        );
    }
}
