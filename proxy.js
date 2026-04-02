import { NextResponse } from 'next/server';

// Auth removed — all routes are public
export async function proxy(request) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};