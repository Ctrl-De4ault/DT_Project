// Auth removed — always return a default admin user
const DEFAULT_USER = {
    id: 'admin',
    name: 'Admin',
    email: 'admin@optiwatt.com',
    role: 'admin',
};

export async function signToken(payload) {
    return 'no-auth';
}

export async function verifyToken(token) {
    return DEFAULT_USER;
}

export async function getSession() {
    return DEFAULT_USER;
}

export async function requireAuth() {
    return DEFAULT_USER;
}

export async function requireAdmin() {
    return DEFAULT_USER;
}
