# Deployment Guide

This guide covers deploying the SEED application to production environments.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployments](#cloud-deployments)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### Required Services

1. **PostgreSQL Database**
   - Managed service recommended (AWS RDS, Supabase, Railway, Neon)
   - Minimum: PostgreSQL 14+
   - Connection pooling enabled

2. **SMTP Email Service**
   - SendGrid, AWS SES, or similar
   - Authenticated SMTP credentials

3. **Google OAuth** (if using social login)
   - Google Cloud Console project
   - OAuth 2.0 credentials configured

4. **Container Registry** (for Docker deployment)
   - Docker Hub, AWS ECR, or Google Container Registry

---

## Environment Setup

### Production Environment Variables

#### Server (`server/.env`)

```env
# Database
DATABASE_URL="postgresql://user:password@db-host:5432/seed_prod"

# Server Configuration
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Security - Generate strong secrets
# openssl rand -base64 64
ACCESS_TOKEN_SECRET=your_very_long_random_access_token_secret_here
REFRESH_TOKEN_SECRET=your_very_long_random_refresh_token_secret_here

# Email Service
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth.googleCallback

# DO NOT SET THESE IN PRODUCTION
# TEST_USER_EMAIL=
# TEST_USER_OTP=
```

#### Web (`web/.env.production`)

```env
NEXT_PUBLIC_SERVER_BASE_URL=https://api.yourdomain.com
```

### Security Checklist

- [ ] Strong JWT secrets (64+ characters)
- [ ] Secure database password
- [ ] HTTPS enabled on all domains
- [ ] Environment variables not in source control
- [ ] API keys rotated from defaults
- [ ] Test user credentials removed
- [ ] CORS configured for production domain only

---

## Database Setup

### 1. Create Production Database

**Using Supabase:**

```bash
# Create project at supabase.com
# Copy connection string from Settings > Database
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
```

**Using Railway:**

```bash
# Create project and PostgreSQL service at railway.app
# Copy DATABASE_URL from service variables
```

**Using AWS RDS:**

```bash
# Create PostgreSQL instance in AWS Console
# Enable automatic backups
# Configure security groups for access
DATABASE_URL="postgresql://username:password@instance.region.rds.amazonaws.com:5432/seeddb"
```

### 2. Run Migrations

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://..."

# Deploy migrations (no interactive prompts)
pnpm --filter @seed/database db:deploy

# Verify with Prisma Studio (optional)
pnpm --filter @seed/database db:studio
```

### 3. Connection Pooling

For production, use connection pooling:

**Prisma Configuration:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add connection pooling
  relationMode = "prisma"
}
```

**PgBouncer (Recommended for high traffic):**

```bash
# Use pooled connection URL
DATABASE_URL="postgresql://user:pass@pooler.region.supabase.co:6543/postgres"
```

---

## Docker Deployment

### Build Production Image

```bash
# Build server image
docker build -t seed-server:latest -f Dockerfile.server .

# Tag for registry
docker tag seed-server:latest your-registry/seed-server:v1.0.0

# Push to registry
docker push your-registry/seed-server:v1.0.0
```

### Docker Compose Production

**`docker-compose.prod.yml`:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    image: your-registry/seed-server:v1.0.0
    restart: always
    ports:
      - '8080:8080'
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      PORT: 8080
      NODE_ENV: production
      FRONTEND_URL: ${FRONTEND_URL}
      ACCESS_TOKEN_SECRET: ${ACCESS_TOKEN_SECRET}
      REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}
      EMAIL_HOST: ${EMAIL_HOST}
      EMAIL_PORT: ${EMAIL_PORT}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
      EMAIL_FROM: ${EMAIL_FROM}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8080/health']
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local

networks:
  default:
    driver: bridge
```

**Deploy:**

```bash
# Create .env file with production values
cp .env.example .env
nano .env

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## Cloud Deployments

### Vercel (Frontend)

1. **Install Vercel CLI:**

   ```bash
   npm install -g vercel
   ```

2. **Deploy:**

   ```bash
   cd web
   vercel --prod
   ```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_SERVER_BASE_URL=https://api.yourdomain.com`

4. **Configure Domain:**
   - Add custom domain in Vercel dashboard
   - Update DNS records as instructed

### Railway (Backend + Database)

1. **Create Project:**
   - Go to railway.app
   - Create new project from GitHub repo

2. **Add PostgreSQL:**
   - Add PostgreSQL service
   - Copy `DATABASE_URL` from variables

3. **Deploy Server:**
   - Add service from repo
   - Set root directory: `/`
   - Set build command: `pnpm install && pnpm build`
   - Set start command: `pnpm --filter @seed/server start`

4. **Environment Variables:**

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   PORT=8080
   NODE_ENV=production
   FRONTEND_URL=https://yourdomain.com
   ACCESS_TOKEN_SECRET=...
   REFRESH_TOKEN_SECRET=...
   EMAIL_HOST=...
   EMAIL_PORT=...
   EMAIL_USER=...
   EMAIL_PASSWORD=...
   EMAIL_FROM=...
   ```

5. **Custom Domain:**
   - Settings → Networking → Custom Domain
   - Add domain and configure DNS

### Google Cloud Run

1. **Build and Push Image:**

   ```bash
   # Build
   docker build -t gcr.io/PROJECT_ID/seed-server:v1.0.0 -f Dockerfile.server .

   # Push
   docker push gcr.io/PROJECT_ID/seed-server:v1.0.0
   ```

2. **Deploy:**

   ```bash
   gcloud run deploy seed-server \
     --image gcr.io/PROJECT_ID/seed-server:v1.0.0 \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars DATABASE_URL="postgresql://..." \
     --set-env-vars NODE_ENV=production \
     --set-env-vars FRONTEND_URL="https://yourdomain.com"
   ```

3. **Add Secrets (Recommended):**

   ```bash
   # Store secrets in Secret Manager
   echo -n "your-secret" | gcloud secrets create access-token-secret --data-file=-

   # Reference in Cloud Run
   gcloud run deploy seed-server \
     --update-secrets ACCESS_TOKEN_SECRET=access-token-secret:latest
   ```

### AWS (ECS + RDS)

1. **Create RDS Instance:**
   - PostgreSQL 14+
   - Enable automatic backups
   - Configure security groups

2. **Build and Push to ECR:**

   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

   # Tag and push
   docker tag seed-server:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/seed-server:latest
   docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/seed-server:latest
   ```

3. **Create ECS Task Definition:**

   ```json
   {
     "family": "seed-server",
     "networkMode": "awsvpc",
     "containerDefinitions": [
       {
         "name": "seed-server",
         "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/seed-server:latest",
         "portMappings": [
           {
             "containerPort": 8080,
             "protocol": "tcp"
           }
         ],
         "environment": [
           { "name": "PORT", "value": "8080" },
           { "name": "NODE_ENV", "value": "production" }
         ],
         "secrets": [
           {
             "name": "DATABASE_URL",
             "valueFrom": "arn:aws:secretsmanager:..."
           },
           {
             "name": "ACCESS_TOKEN_SECRET",
             "valueFrom": "arn:aws:secretsmanager:..."
           }
         ]
       }
     ]
   }
   ```

4. **Deploy Service:**
   - Create ECS service with task definition
   - Configure Application Load Balancer
   - Set up auto-scaling

---

## CI/CD Pipeline

### GitHub Actions

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm lint

      - name: Build packages
        run: pnpm build

  deploy-server:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t seed-server:${{ github.sha }} -f Dockerfile.server .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker tag seed-server:${{ github.sha }} ${{ secrets.DOCKER_USERNAME }}/seed-server:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/seed-server:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull ${{ secrets.DOCKER_USERNAME }}/seed-server:latest
            docker stop seed || true
            docker rm seed || true
            docker run -d \
              --name seed \
              -p 8080:8080 \
              --env-file /home/user/.env \
              ${{ secrets.DOCKER_USERNAME }}/seed-server:latest

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./web
```

---

## Monitoring & Logging

### Application Monitoring

**Add health check endpoint:**

```typescript
// server/index.ts
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});
```

**Monitoring Tools:**

- **Uptime Robot**: Free uptime monitoring
- **Sentry**: Error tracking and performance
- **LogRocket**: Session replay
- **Datadog**: Full observability platform

### Logging

**Winston Logger Setup:**

```typescript
// server/helpers/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}
```

**Usage:**

```typescript
import { logger } from './helpers/logger';

logger.info('User logged in', { userId: user.id });
logger.error('Database connection failed', { error: err.message });
```

---

## Backup & Recovery

### Database Backups

**Automated Daily Backups:**

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

**Cron Job:**

```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

**Restore from Backup:**

```bash
psql $DATABASE_URL < backup_20251218_020000.sql
```

### Disaster Recovery Plan

1. **Regular Backups**: Automated daily backups
2. **Off-site Storage**: S3 or equivalent
3. **Test Restores**: Monthly restore tests
4. **Documentation**: Recovery procedures documented
5. **Monitoring**: Alerts for backup failures

---

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

### CDN Configuration

Use CloudFlare or similar:

- Cache static assets
- DDoS protection
- SSL/TLS
- Edge caching

### Load Balancing

For high traffic:

- Multiple server instances
- Load balancer (Nginx, AWS ALB)
- Session affinity for WebSocket

---

## Security Hardening

### HTTPS Configuration

**Nginx Reverse Proxy:**

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Rate Limiting

```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Revert to previous Docker image
docker pull your-registry/seed-server:v1.0.0
docker stop seed && docker rm seed
docker run -d --name seed -p 8080:8080 --env-file .env your-registry/seed-server:v1.0.0

# Or with docker-compose
docker-compose -f docker-compose.prod.yml down
# Edit image version in compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Revert last migration
pnpm --filter @seed/database prisma migrate resolve --rolled-back MIGRATION_NAME

# Restore from backup if needed
psql $DATABASE_URL < backup_20251218_020000.sql
```

---

## Post-Deployment Checklist

- [ ] All services running and healthy
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] HTTPS working correctly
- [ ] CORS configured for production domain
- [ ] Email sending working (test OTP)
- [ ] Google OAuth working (if enabled)
- [ ] Monitoring alerts configured
- [ ] Backup system running
- [ ] Performance acceptable (check metrics)
- [ ] Error tracking configured
- [ ] Documentation updated

---

## Support

For deployment issues:

- Check server logs: `docker logs seed`
- Verify environment variables
- Test database connectivity
- Check firewall/security group rules
- Review monitoring dashboards
