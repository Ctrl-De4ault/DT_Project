const { db } = require('./lib/firebase');
const { seedDatabase } = require('./lib/seed');

async function test() {
    console.log('--- Firebase Verification Script ---');
    try {
        console.log('1. Checking Firestore connection...');
        const blocksSnapshot = await db.collection('blocks').get();
        console.log(`Connection successful. Found ${blocksSnapshot.size} blocks.`);

        console.log('2. Running seeder...');
        await seedDatabase();
        console.log('Seeding complete.');

        console.log('3. Verifying user lookup...');
        const userDoc = await db.collection('users').doc('admin@cems.com').get();
        if (userDoc.exists) {
            console.log('Admin user found:', userDoc.data().name);
        } else {
            console.log('Admin user NOT found. Seeding might have failed or check doc ID.');
        }

        console.log('4. Testing complex aggregation simulation (Analytics)...');
        const energySnapshot = await db.collection('energy_data').limit(5).get();
        console.log(`Found ${energySnapshot.size} energy data entries.`);

        console.log('--- Verification Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

test();
