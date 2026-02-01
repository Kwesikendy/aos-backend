// Simple MongoDB connection test script
// Run this after setting up MongoDB to verify connection

require('dotenv').config();
const mongoose = require('mongoose');

async function testMongoDBConnection() {
  console.log('🧪 Testing MongoDB Connection...');
  console.log('Connection URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/academyos');
  
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    };

    console.log('🔌 Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/academyos', options);
    
    console.log('✅ SUCCESS: MongoDB Connected!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // List all collections to verify database is accessible
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📊 Collections found:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ FAILED: MongoDB connection error:');
    console.error('   Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting tips:');
    console.error('   1. Make sure MongoDB is running');
    console.error('   2. Check your MONGODB_URI in .env file');
    console.error('   3. For local MongoDB: run "net start MongoDB"');
    console.error('   4. For Atlas: check network access and credentials');
    
    process.exit(1);
  }
}

// Run the test
testMongoDBConnection().catch(console.error);
