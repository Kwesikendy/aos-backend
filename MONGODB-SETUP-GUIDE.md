# MongoDB Setup Guide for AcademyOS

## Option 1: Install MongoDB Locally (Recommended for Development)

### Step 1: Download and Install MongoDB Community Server
1. Go to: https://www.mongodb.com/try/download/community
2. Download the Windows MSI installer
3. Run the installer and follow the setup wizard
4. Choose "Complete" installation type
5. Install MongoDB as a service (recommended)

### Step 2: Start MongoDB Service
```bash
# Open Command Prompt as Administrator
net start MongoDB
```

### Step 3: Verify Installation
```bash
# Check if MongoDB is running
mongo --version
mongod --version

# Connect to MongoDB shell
mongo
```

### Step 4: Create .env file with local connection
```bash
# Create .env file in your project root
MONGODB_URI=mongodb://localhost:27017/academyos
```

## Option 2: MongoDB Atlas (Cloud - Free Tier)

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/atlas
2. Sign up for a free account
3. Create a new cluster (choose free tier)

### Step 2: Configure Database Access
1. Go to Database Access → Add New Database User
2. Set username and password
3. Set permissions: "Read and write to any database"

### Step 3: Configure Network Access
1. Go to Network Access → Add IP Address
2. Add "0.0.0.0/0" to allow connections from anywhere
   (or your specific IP for security)

### Step 4: Get Connection String
1. Go to Clusters → Connect → Connect your application
2. Copy the connection string
3. Replace <password> with your actual password

### Step 5: Update .env file
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/academyos?retryWrites=true&w=majority
```

## Quick Fix for Current Issues

### 1. Fix Deprecated Options in database.js
The current config uses deprecated options. Update `config/database.js`:

```javascript
const options = {
  // Remove useNewUrlParser and useUnifiedTopology
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

### 2. Fix Duplicate Index Warnings
Check your models and remove duplicate index definitions:
- Remove `index: true` from schema fields if you're also using `schema.index()`
- Or remove the `schema.index()` calls if using `index: true`

## Testing Your Setup

### Test MongoDB Connection
```bash
# Start your server
npm run dev

# Or run the test script
node test-phase2-complete.js
```

### Expected Output When Working:
```
🔌 Attempting to connect to MongoDB...
✅ MongoDB Connected: localhost
📊 Database: academyos
✅ Health check: 200 AcademyOS Backend Server is running
```

## Troubleshooting

### If MongoDB won't start locally:
```bash
# Check if MongoDB service is running
services.msc

# Or try manual start
mongod --dbpath "C:\data\db"
```

### If you get connection errors:
1. Check if MongoDB is running: `net start MongoDB`
2. Verify connection string in .env
3. Check firewall settings
4. For Atlas: verify network access and credentials

## Next Steps After Setup

1. **Create .env file** with your MongoDB connection string
2. **Test the connection** with `npm run dev`
3. **Verify all endpoints** are working
4. **Start frontend integration**

Choose the option that works best for your development setup!
