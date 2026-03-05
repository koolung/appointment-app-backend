# Railway Deployment Guide

## Prerequisites
- Railway Account (railway.app)
- Git repository pushed to GitHub
- PostgreSQL database (Railway will provide)

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub account and select the repository

## Step 2: Add PostgreSQL Database

1. In your Railway project dashboard, click "Add"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a PostgreSQL instance
4. The `DATABASE_URL` will be available in environment variables

## Step 3: Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=your-production-secret-here
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_USER=booking@beauteliahair.com
SMTP_PASSWORD=your-password
SMTP_FROM=booking@beauteliahair.com
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
REDIS_URL=redis://your-redis-url
```

**Important:** Railway automatically sets `DATABASE_URL` when you add PostgreSQL, so you don't need to set it manually.

## Step 4: Deploy Backend

1. Go to your project settings
2. Set **Root Directory** to the backend folder (if in a monorepo): `backend`
3. Railway will detect the `Dockerfile` and `railway.json`
4. Click "Deploy"

## Step 5: Verify Deployment

Once deployed:
1. Check the deployment logs in Railway dashboard
2. The backend will automatically run: `prisma migrate deploy` then start the server
3. Your API will be available at the Railway-generated URL

## Step 6: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-railway-backend-url.railway.app
   ```
5. Deploy

## Database Migrations

The `start:prod` script in package.json automatically runs:
```
prisma migrate deploy
```

This applies all pending migrations on startup. Make sure all migration files are committed to git.

## Local Development with PostgreSQL

To test locally before deploying:

1. Install PostgreSQL locally
2. Create a database:
   ```
   createdb salon_booking_db
   ```
3. Your .env is already configured for this
4. Run migrations:
   ```
   npm run prisma:migrate
   ```
5. Start development server:
   ```
   npm run start:dev
   ```

## Troubleshooting

### DATABASE_URL not found
- Check Railway dashboard Variables tab
- Ensure PostgreSQL database is added to the project
- Restart the deployment

### Migrations fail
- Check Railway logs
- Verify all `.sql` migration files exist in `prisma/migrations/`
- Ensure permissions are correct in the database

### Port issues
- Railway assigns a PORT environment variable dynamically
- The app listens on `process.env.PORT` (currently uses 3000 as default)

## Useful Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations locally
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Check Prisma Studio
npm run prisma:studio
```
