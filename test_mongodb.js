const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not defined in .env');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Successfully connected to MongoDB Atlas!');

        const db = client.db();
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        // Test a sample query
        const usersCount = await db.collection('users').countDocuments();
        console.log(`Number of users in database: ${usersCount}`);

    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    } finally {
        await client.close();
    }
}

testConnection();
