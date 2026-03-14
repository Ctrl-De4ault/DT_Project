import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth.js';

export async function proxy(request) {
    const { pathname } = request.nextUrl;

    // Public routes
    if (pathname.startsWith('/login') ||
        pathname === '/api/auth/login' ||
        pathname === '/api/auth/signup') {
        return NextResponse.next();
    }

    const token = request.cookies.get('cems_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('cems_token');
        return response;
    }

    // Admin-only routes
    const adminOnlyPaths = ['/users', '/settings', '/blocks', '/buildings', '/rooms', '/alerts'];
    const isAdminOnly = adminOnlyPaths.some(p => pathname.startsWith(p));
    if (isAdminOnly && payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
