# Redis Configuration Guide

## Environment Variables

Your `.env` file should be located in the `backend/` directory and contain:

### Option 1: Using REDIS_URL (Recommended)
```env
REDIS_URL=redis://localhost:11425
```

### Option 2: Using separate host/port
```env
REDIS_HOST=localhost
REDIS_PORT=11425
REDIS_PASSWORD=your_password_if_needed
```

## Verification

When the server starts, you should see a log message like:
```
🔌 Redis connection config: localhost:11425 (from REDIS_PORT)
```

If you see `6379` in the log, it means the environment variable is not being read correctly.

## Troubleshooting

1. **Check .env file location**: Must be in `backend/.env` (not root directory)
2. **Check variable names**: Must be exactly `REDIS_URL` or `REDIS_PORT` (case-sensitive)
3. **Restart server**: Environment variables are loaded at startup
4. **Check logs**: The connection config log shows which port is being used

## Starting Redis

If you need to start Redis locally:
```bash
# Using Docker
docker-compose up -d redis

# Or if Redis is installed locally
redis-server --port 11425
```
