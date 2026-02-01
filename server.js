// AcademyOS Backend Server - Restart Triggered (Postgres Migration)
// Main entry point for the Express.js application

// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const express = require('express');
// const mongoose = require('mongoose'); // Removed for Prisma
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Import route handlers
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const assignmentRoutes = require('./routes/assignments');
const enrollmentRoutes = require('./routes/enrollments');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const reportsRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

// Import database configuration
// const connectDB = require('./config/database'); // Removed for Prisma
const prisma = require('./config/database'); // Import Prisma Client

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to PostgreSQL (Prisma handles connection pool automatically)
// Prisma will verify connection lazily, or we can force a check:
prisma.$connect()
  .then(() => console.log('✅ Connected to PostgreSQL via Prisma'))
  .catch(err => {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  });

// Middleware setup

// CORS configuration - allow requests from frontend
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Request logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AcademyOS Backend Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Global Error Handler:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 AcademyOS Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  });
}

// Export app for testing purposes
module.exports = app;
