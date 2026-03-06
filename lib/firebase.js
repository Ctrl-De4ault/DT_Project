
import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            // In development, if env vars aren't set, try to default to ADC or emulators if needed
            // but for production-ready approach, we expect these env vars
            console.warn('Firebase environment variables missing. Firebase initialized with defaults (if locally authenticated).');
            admin.initializeApp();
        }
    } catch (error) {
        console.error('Firebase admin initialization error', error.stack);
    }
}

export const db = admin.firestore();
export default admin;
