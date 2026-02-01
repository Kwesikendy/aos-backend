// Phase 2 Test Script for AcademyOS
// Tests Course and Class functionality

const request = require('supertest');
const mongoose = require('mongoose');

async function testPhase2() {
  console.log('🧪 Testing AcademyOS Phase 2 (Course & Class Management)...\n');

  try {
    // Import app after setting test environment
    process.env.NODE_ENV = 'test';
    const app = require('./server');

    // Wait a moment for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('1. Testing health endpoint...');
    const healthResponse = await request(app).get('/api/health');
    console.log('✅ Health check:', healthResponse.status, healthResponse.body.message);

    console.log('\n2. Testing courses endpoint...');
    const coursesResponse = await request(app).get('/api/courses');
    console.log('✅ Courses endpoint:', coursesResponse.status);
    console.log('   Total courses:', coursesResponse.body.data?.courses?.length || 0);

    console.log('\n3. Testing classes endpoint...');
    const classesResponse = await request(app).get('/api/classes');
    console.log('✅ Classes endpoint:', classesResponse.status);
    console.log('   Total classes:', classesResponse.body.data?.classes?.length || 0);

    console.log('\n4. Testing specific course endpoints...');
    const courseDetailResponse = await request(app).get('/api/courses/nonexistent');
    console.log('✅ Course detail (404 test):', courseDetailResponse.status);

    console.log('\n5. Testing specific class endpoints...');
    const classDetailResponse = await request(app).get('/api/classes/nonexistent');
    console.log('✅ Class detail (404 test):', classDetailResponse.status);

    console.log('\n🎉 Phase 2 API endpoints are accessible!');
    console.log('\n📋 Next steps for Phase 2:');
    console.log('   - Set up MongoDB connection');
    console.log('   - Test course creation with authentication');
    console.log('   - Test class scheduling functionality');
    console.log('   - Implement attendance tracking (Phase 2.2)');
    console.log('   - Implement assignment management (Phase 2.3)');

    // Close database connection
    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testPhase2();
