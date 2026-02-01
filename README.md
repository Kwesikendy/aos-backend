# AcademyOS Backend

A comprehensive Learning Management System (LMS) backend built with Node.js, Express.js, and MongoDB. This is the backend API for the AcademyOS platform that supports multiple user roles including Admin, Teacher, Student, and Parent.

## 🚀 Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Multiple User Roles**: Admin, Teacher, Student, and Parent with different permissions
- **RESTful API**: Clean and consistent API design following REST principles
- **MongoDB Integration**: Robust database operations with Mongoose ODM
- **Input Validation**: Comprehensive validation using express-validator
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Testing Ready**: Jest configuration for unit and integration testing
- **Environment Configuration**: Flexible configuration using environment variables

## 🛠️ Tech Stack

- **Runtime**: Node.js (>= 18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Testing**: Jest + Supertest
- **Security**: bcryptjs for password hashing
- **Logging**: morgan for HTTP request logging

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd academyos-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or use MongoDB Atlas.

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## ⚙️ Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/academyos
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/stats` - Get user statistics (Admin only)

## 🧪 Testing

Run tests with coverage:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📁 Project Structure

```
academyos-backend/
├── config/           # Database and configuration
│   └── database.js
├── controllers/      # Route controllers
│   ├── authController.js
│   └── userController.js
├── middleware/       # Custom middleware
│   └── auth.js
├── models/           # MongoDB models
│   └── User.js
├── routes/           # API routes
│   ├── auth.js
│   └── users.js
├── tests/            # Test files
│   └── setup.js
├── uploads/          # File uploads directory
├── .env.example      # Environment variables template
├── jest.config.js    # Jest configuration
├── package.json      # Dependencies and scripts
└── server.js         # Main server file
```

## 🔐 User Roles

- **Admin**: Full system access, user management, statistics
- **Teacher**: Course management, attendance tracking, grading
- **Student**: Course enrollment, assignment submission, profile management
- **Parent**: Student progress monitoring, communication

## 🚦 Development

1. **Code Style**: Follow consistent naming conventions and code structure
2. **Validation**: Always validate input using express-validator
3. **Error Handling**: Use proper error handling middleware
4. **Testing**: Write tests for new features and bug fixes
5. **Documentation**: Update API documentation when adding new endpoints

## 📝 API Documentation

For detailed API documentation, check the Postman collection or Swagger documentation (when implemented).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for education and learning management**
