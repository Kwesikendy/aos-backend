// Test Setup for AcademyOS
// Configuration and utilities for testing

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/database');

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test hooks
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');
  
  // Connect to test database
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/academyos-test';
  
  await connectDB();
  console.log('✅ Test database connected');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Drop test database and disconnect
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await disconnectDB();
  }
  
  console.log('✅ Test environment cleaned up');
});

// Clear database between tests
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Test utilities
global.testUtils = {
  /**
   * Generate test user data
   * @param {string} role - User role
   * @returns {Object} Test user data
   */
  generateTestUser: (role = 'student') => ({
    firstName: 'Test',
    lastName: role.charAt(0).toUpperCase() + role.slice(1),
    email: `test.${role}@example.com`,
    password: 'Password123',
    role: role,
    phone: '+1234567890',
    dateOfBirth: '2000-01-01'
  }),

  /**
   * Wait for specified milliseconds
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise}
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});
