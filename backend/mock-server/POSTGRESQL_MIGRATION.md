# PostgreSQL Migration Guide

## Prerequisites

1. **Install PostgreSQL** on your system:

   - **macOS**: `brew install postgresql`
   - **Ubuntu**: `sudo apt-get install postgresql postgresql-contrib`
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Start PostgreSQL service**:
   - **macOS**: `brew services start postgresql`
   - **Linux**: `sudo systemctl start postgresql`

## Database Setup

1. **Create database and user**:

   ```bash
   # Connect to PostgreSQL as superuser
   sudo -u postgres psql

   # Create database
   CREATE DATABASE travelsure_flights;

   # Create user (optional, for security)
   CREATE USER travelsure WITH PASSWORD 'your_password';

   # Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE travelsure_flights TO travelsure;

   # Exit psql
   \q
   ```

## Environment Variables

Create a `.env` file in your project root:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travelsure_flights
DB_USER=postgres
DB_PASSWORD=your_password

# Application Configuration
PORT=3001
```

## Installation

1. **Install PostgreSQL dependencies**:

   ```bash
   npm install pg
   ```

2. **Update your package.json** (or use the provided package-postgres.json):
   ```json
   {
     "dependencies": {
       "express": "^4.18.2",
       "cors": "^2.8.5",
       "pg": "^8.11.3",
       "moment": "^2.29.4",
       "swagger-jsdoc": "^6.2.8",
       "swagger-ui-express": "^5.0.0"
     }
   }
   ```

## Running the Application

### Local Development

```bash
# With default settings (localhost PostgreSQL)
node index-sqlite.js
```

### With Custom Database Settings

```bash
# Using environment variables
DB_HOST=your-db-host DB_NAME=your-db-name DB_USER=your-user DB_PASSWORD=your-password node index-sqlite.js
```

### Docker PostgreSQL (Alternative)

```bash
# Run PostgreSQL in Docker
docker run --name postgres-travelsure \
  -e POSTGRES_DB=travelsure_flights \
  -e POSTGRES_USER=travelsure \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Then run your app
DB_USER=travelsure DB_PASSWORD=password node index-sqlite.js
```

## Key Changes Made

### Database Connection

- Replaced `sqlite3` with `pg` (PostgreSQL client)
- Added connection pooling for better performance
- Updated connection configuration

### SQL Syntax Updates

- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `TEXT` → `VARCHAR(n)` for size-limited fields
- `DATETIME` → `TIMESTAMP`
- `BOOLEAN DEFAULT 0` → `BOOLEAN DEFAULT FALSE`
- `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`
- Parameter placeholders: `?` → `$1, $2, $3...`

### Query Methods

- `db.run()` → `client.query()`
- `db.get()` → `client.query()` (first row)
- `db.all()` → `client.query()` (all rows)
- Added proper connection pooling and client release

### Error Handling

- Updated to use async/await patterns
- Proper PostgreSQL error handling
- Connection pool management

## Benefits of PostgreSQL

1. **Better Performance**: Optimized for concurrent connections
2. **ACID Compliance**: Full transaction support
3. **Scalability**: Better handling of large datasets
4. **Advanced Features**: JSON support, full-text search, etc.
5. **Production Ready**: Industry standard for web applications

## Migration Notes

- All existing SQLite queries have been converted to PostgreSQL
- Data types optimized for PostgreSQL
- Connection pooling implemented for better performance
- Proper error handling and resource management
- Environment-based configuration for different deployments

Your flight data will be migrated automatically when you first run the application with PostgreSQL.
