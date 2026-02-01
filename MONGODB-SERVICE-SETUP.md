# MongoDB Windows Service Setup Guide

## Recommended Service Account Configuration

### Option 1: Local System Account (Recommended for Development)
**Use the "Local System" account** - This is the simplest and most common setup for development environments.

**Why Local System:**
- No password management required
- Has sufficient privileges to run MongoDB
- Works seamlessly for local development
- No domain configuration needed

**Installation Steps:**
1. Run MongoDB installer
2. Choose "Complete" installation
3. Select "Install MongoDB as a Service"
4. Choose "Run service as Network Service user" or "Local System account"
5. Service name: "MongoDB"
6. Data directory: `C:\data\db\` (default)

### Option 2: Custom User Account (For Production)
If you need a custom user account for production environments:

**Recommended Settings:**
- **Account Type**: Local User (not domain)
- **Username**: `MongoDBService`
- **Password**: Choose a strong password
- **User Rights**: 
  - Log on as a service
  - Read/write permissions to data directory

### Step-by-Step Service Setup

#### Using MongoDB Installer (Easiest):
1. Download MongoDB Community Server MSI
2. Run installer as Administrator
3. Choose "Complete" setup type
4. Check "Install MongoDB as a Service"
5. Select "Run service as Network Service user"
6. Service Name: `MongoDB`
7. Data Directory: `C:\data\db\`
8. Log Directory: `C:\data\log\`

#### Manual Service Creation (Advanced):
```bash
# Create data directories
mkdir C:\data\db
mkdir C:\data\log

# Install MongoDB service
mongod --install --dbpath "C:\data\db" --logpath "C:\data\log\mongod.log" --serviceName "MongoDB" --serviceDisplayName "MongoDB Server" --serviceDescription "MongoDB Database Server" --serviceUser "NT AUTHORITY\NetworkService"
```

### Verifying Service Installation

```bash
# Check if MongoDB service exists
sc query MongoDB

# Check service status
net start MongoDB

# View service details
sc qc MongoDB
```

### Troubleshooting Service Issues

#### If service won't start:
1. **Check permissions** on data directory:
   ```bash
   icacls "C:\data\db" /grant "NETWORK SERVICE":(OI)(CI)F
   ```

2. **Verify service account** has proper rights:
   - "Log on as a service" right
   - Read/write access to data directory

3. **Check event logs** for detailed errors:
   - Open Event Viewer
   - Check Windows Logs → Application

#### Common Error: "Service did not start due to logon failure"
- The service account doesn't have "Log on as a service" right
- Solution: Grant the right or use Network Service account

### Security Considerations

**For Development:**
- Use "Network Service" or "Local System" - simplest setup
- No additional configuration needed

**For Production:**
- Create dedicated local user account
- Grant minimum required privileges
- Set strong password
- Regular security updates

### Quick Start Recommendation

**For your development environment:**
1. Run MongoDB installer as Administrator
2. Choose "Install as a Service" 
3. Select "Network Service" account
4. Use default settings
5. Run: `net start MongoDB`

This will give you a working MongoDB instance with minimal configuration hassle.
