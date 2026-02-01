
// Simple test script to verify AcademyOS server functionality
const request = require('supertest');
const mongoose = require('mongoose');

async function testServer() {
  console.log('🧪 Testing AcademyOS Server...\n');

  try {
    // Import app after setting test environment
    process.env.NODE_ENV = 'test';
    const app = require('./server');

    // Wait a moment for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await request(app).get('/api/health');
    console.log('✅ Health check:', healthResponse.status, healthResponse.body.message);

    // Test 404 handler
    console.log('\n2. Testing 404 handler...');
    const notFoundResponse = await request(app).get('/api/nonexistent');
    console.log('✅ 404 handler:', notFoundResponse.status, notFoundResponse.body.message);

    // Test user registration
    console.log('\n3. Testing user registration...');
    const registerData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password123',
      role: 'student'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(registerData);

    if (registerResponse.status === 201) {
      console.log('✅ User registration successful');
      console.log('   User ID:', registerResponse.body.data.user._id);
      console.log('   Token received:', registerResponse.body.data.token ? 'Yes' : 'No');
    } else {
      console.log('❌ Registration failed:', registerResponse.status, registerResponse.body.message);
      if (registerResponse.body.errors) {
        console.log('   Validation errors:', registerResponse.body.errors);
      }
    }

    // Test login
    console.log('\n4. Testing user login...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123'
      });

    if (loginResponse.status === 200) {
      console.log('✅ Login successful');
      const token = loginResponse.body.data.token;
      console.log('   Token:', token ? 'Received' : 'Missing');

      // Test protected route
      console.log('\n5. Testing protected route...');
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      if (meResponse.status === 200) {
        console.log('✅ Protected route access successful');
        console.log('   User email:', meResponse.body.data.user.email);
      } else {
        console.log('❌ Protected route failed:', meResponse.status, meResponse.body.message);
      }
    } else {
      console.log('❌ Login failed:', loginResponse.status, loginResponse.body.message);
    }

    console.log('\n🎉 Server test completed!');

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
testServer();
