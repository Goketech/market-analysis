# Database Migrations

This directory contains SQL migration scripts for setting up the database schema.

## Running Migrations

### Using psql (PostgreSQL client)

```bash
# Connect to your database
psql -h localhost -U postgres -d market_intelligence

# Run the migration
\i migrations/001_create_performance_tables.sql
```

### Using Docker

If you're using Docker Compose:

```bash
docker exec -i mih-postgres psql -U postgres -d market_intelligence < migrations/001_create_performance_tables.sql
```

### Using Node.js script (optional)

You can also create a migration runner script if needed.

## Migration Files

- `001_create_performance_tables.sql` - Creates tables for stock performance, sentiment cache, and SEC filings

## Notes

- All migrations are idempotent (can be run multiple times safely)
- Tables use `IF NOT EXISTS` to prevent errors on re-runs
- Indexes are created for performance optimization
