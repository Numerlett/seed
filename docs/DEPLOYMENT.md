# Deployment Guide

SEED uses a split deployment model:

- **Frontend** → Vercel or Netlify (Next.js static/SSR)
- **Backend** → Any Docker-capable cloud provider (Railway, Render, GCP Cloud Run, AWS ECS) **or** a serverless platform (Vercel, Lambda) when running in serverless mode.

---

## Table of Contents

- [Deployment Modes](#deployment-modes)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Backend Deployment (Docker)](#backend-deployment-docker)
- [Frontend Deployment (Vercel / Netlify)](#frontend-deployment-vercel--netlify)
- [CI/CD Pipeline](#cicd-pipeline)
- [Database Management](#database-management)
- [Post-Deployment Checklist](#post-deployment-checklist)
- [Rollback](#rollback)

---

## Deployment Modes

The backend runs in one of two modes selected by the `DEPLOYMENT_MODE` env var:

| Mode | Use when | Requires Redis? | Worker process? | Scheduled jobs? |
|---|---|---|---|---|
| `long-running` (schema default) | Production with workers, dev with full feature parity, container hosts (Fly, Railway, Render, ECS) | **Yes** — `REDIS_URL` required | Yes — deploy `@seed/jobs` separately | Yes |
| `serverless` | Pre-revenue / cheap deploys on Vercel, Lambda, Cloud Run scale-to-zero | No | No | **Disabled** — features that require schedulers throw `NOT_IMPLEMENTED` |

> **`long-running` currently refuses to boot.** `jobs/queues.ts` defines nine
> queues and no `Worker` consumes any of them, so queued email, SMS, PDFs and
> e-invoices would be accepted and silently never run. `server/index.ts` exits
> with an explanatory error instead. **Deploy in `serverless` mode** (which is
> what `fly.toml` sets) until a worker process exists, then remove the guard.

### How features behave per mode

Callers in `server/` should import from `server/lib/dispatch` rather than calling adapters or queues directly. The dispatch layer abstracts the mode switch:

| Feature | Serverless | Long-running |
|---|---|---|
| `sendEmail` / `sendSms` / `sendWhatsApp` | Inline call to `@seed/integrations` adapter | Enqueue to BullMQ (worker delivers) |
| `generateEInvoice` | Inline GSP API call, returns `EInvoiceResponse` | Enqueue, returns `null`; worker persists IRN |
| `generatePdfAsync` | Throws `ServerlessUnavailableError` | Enqueue PDF + email job |
| Sync invoice PDF download | Call `generateInvoicePdf` from `@seed/pdf` directly (mode-agnostic) | Same |
| Recurring invoices, stock alerts, payment reminders, large reports, OTP cleanup sweep | tRPC procedure throws `NOT_IMPLEMENTED` (gated by `longRunningOnlyProcedure`) | Worker handles |

### Picking a mode

- **Reaching first customer on free tiers**: serverless. Vercel + Neon + your existing Vercel-hosted web app = ~$0/mo. Caveat: scheduled features (recurring invoices, alerts, reminders) are unavailable until you graduate.
- **Once you have paying customers** or need any scheduled feature: long-running. Add a small Redis (Upstash fixed-tier ~$10/mo, Railway-bundled, or self-hosted on a Fly volume) and deploy the `@seed/jobs` worker as a second process.

### Switching modes

`long-running` is the schema default but is currently guarded (see above), so deployments must set `serverless` explicitly. To deploy in serverless mode:

1. Set `DEPLOYMENT_MODE=serverless` in the deploy environment.
2. Omit `REDIS_URL` (or leave it — it's ignored).
3. Do not deploy the `@seed/jobs` worker process.
4. Any tRPC route guarded by `longRunningOnlyProcedure` will return `NOT_IMPLEMENTED` to the client; surface this in the UI by hiding/disabling the corresponding feature.

---

## Architecture Overview

```
User Browser
  │
  ├── HTTPS → Vercel/Netlify (Next.js frontend)
  │             │
  │             └── tRPC over HTTP → Docker container (Express server :8080)
  │                                    │
  │                                    ├── PostgreSQL (managed DB)
  │                                    ├── AWS S3 (file storage)
  │                                    └── SMTP (email / OTP)
  │
  └── Google OAuth redirect → backend /api/auth.googleCallback
```

The Docker image is built from `Dockerfile.server` at the repo root. It is a multi-stage build that compiles all seven workspace packages (`database`, `schemas`, `integrations`, `jobs`, `tax`, `accounting`, `pdf`) before assembling the production runner.

Migrations do **not** run on container start. They run once per deploy through Fly's `release_command` (see `fly.toml`), so a scale-from-zero cold start does not pay migration latency and simultaneous machine starts do not contend on the migration advisory lock. On other hosts, run `pnpm --filter @seed/database db:deploy` as a release/pre-deploy step.

---

## Prerequisites

Provision these before deploying:

| Service | Purpose | Recommended options |
|---------|---------|---------------------|
| PostgreSQL 14+ | Primary database | Supabase, Neon, Railway, AWS RDS |
| AWS S3 bucket | File / document storage | AWS S3 |
| SMTP relay | OTP emails | AWS SES, SendGrid, Postmark |
| Google OAuth app | Social login | Google Cloud Console |
| Container registry | Docker image storage | Docker Hub, AWS ECR, GCP Artifact Registry |

---

## Environment Variables

### Server

All variables are validated at startup via Zod. The server will refuse to start if any required variable is missing or malformed.

```env
# Server
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Auth secrets — generate with: openssl rand -base64 64
ACCESS_TOKEN_SECRET=<min 32 chars>
REFRESH_TOKEN_SECRET=<min 32 chars>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Database
DATABASE_URL=postgresql://user:password@host:5432/seed_prod

# Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Email (SMTP)
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=<SMTP username / API key>
SMTP_PASSWORD=<SMTP password>
SMTP_MAIL=noreply@yourdomain.com

# AWS S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<IAM key>
AWS_SECRET_ACCESS_KEY=<IAM secret>
AWS_S3_BUCKET_NAME=<bucket name>

# DO NOT SET IN PRODUCTION:
# TEST_MAIL=
# TEST_OTP=
```

### Optional integrations

These are all optional. A deployment without them still boots; the features that
depend on them refuse with `PRECONDITION_FAILED` and a message naming what is
missing, and `system.getIntegrationStatus` reports them as unconfigured so the
UI can disable the controls. Nothing is written to the database for an
integration that cannot complete.

```env
# Email provider — defaults to smtp using the SMTP_* block above
EMAIL_PROVIDER=resend
RESEND_API_KEY=<from Resend>
RESEND_MAIL=noreply@yourdomain.com

# SMS — msg91 (default) or twilio
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=<key>
MSG91_SENDER_ID=<6-char sender id>

# WhatsApp — twilio (default) or gupshup
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
WHATSAPP_FROM=whatsapp:+14155238886

# E-invoicing via a GST Suvidha Provider.
# GSP_BASE_URL defaults to the NIC sandbox; the rest have no safe default.
GSP_BASE_URL=https://einv-apisandbox.nic.in
GSP_CLIENT_ID=<from your GSP>
GSP_CLIENT_SECRET=<from your GSP>
GSP_USERNAME=<IRP username>
GSP_PASSWORD=<IRP password>
GSP_GSTIN=<15-char GSTIN registered with the IRP>

# Online payments
RAZORPAY_KEY_ID=<key id>
RAZORPAY_KEY_SECRET=<key secret>
RAZORPAY_WEBHOOK_SECRET=<webhook signing secret>
```

**The webhook secret is not optional once Razorpay keys are set.** The server
refuses to boot with keys but no `RAZORPAY_WEBHOOK_SECRET`: payment links would
go out, customers would pay, and no confirmation could be verified — so nothing
would ever be recorded against the invoice.

After enabling Razorpay, register `https://<your-api-host>/webhooks/razorpay` in
the Razorpay dashboard for the `payment_link.paid` event.

### Graceful shutdown

The server handles `SIGTERM` and `SIGINT`: it stops accepting connections, lets
in-flight requests finish, disconnects Prisma, and exits — with a 10-second
hard deadline in case a request hangs. Platforms that replace machines on
deploy (Fly, ECS, Railway) send `SIGTERM` first, and without this a request
that had written an invoice but not yet its journal entry could be cut in half.
Give the platform at least 15 seconds of shutdown grace.

### Frontend (Web)

```env
# .env.production or Vercel/Netlify dashboard
NEXT_PUBLIC_SERVER_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=<same bucket as server>
NEXT_PUBLIC_AWS_REGION=<same region as server>
```

> `NEXT_PUBLIC_AWS_S3_BUCKET_NAME` and `NEXT_PUBLIC_AWS_REGION` are used by `next.config.ts` to allowlist S3 image domains.

---

## Backend Deployment (Docker)

### 1. Build the image

From the repo root:

```bash
docker build -t seed-server:latest -f Dockerfile.server .
```

The build compiles all workspace packages in dependency order and produces a lean runner image with only production dependencies.

### 2. Push to a container registry

```bash
# Docker Hub
docker tag seed-server:latest youruser/seed-server:v1.0.0
docker push youruser/seed-server:v1.0.0

# AWS ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com
docker tag seed-server:latest ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/seed-server:v1.0.0
docker push ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/seed-server:v1.0.0
```

### 3. Run the container

The container starts the server directly. Apply migrations first, as a release step:

```bash
docker run --rm --env-file server/.env seed-server:latest \n  pnpm --filter @seed/database db:deploy
```

```bash
docker run -d \
  --name seed-server \
  -p 8080:8080 \
  --env-file .env \
  --restart unless-stopped \
  seed-server:latest
```

Or via Docker Compose (`docker-compose.prod.yml` at repo root):

```yaml
services:
  server:
    image: youruser/seed-server:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    env_file: .env
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:8080/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3
```

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

### Cloud provider options

#### Railway

1. New project → Deploy from Docker image (or link GitHub repo)
2. Set root directory `/`, build command uses the `Dockerfile.server`
3. Add all server env vars in the Railway variables tab
4. Railway auto-provisions a public HTTPS URL — use that as `FRONTEND_URL` value on the Vercel side

#### Render

1. New Web Service → Docker
2. Dockerfile path: `Dockerfile.server`
3. Port: `8080`
4. Add env vars in the Environment tab
5. Enable "Auto-Deploy" on push to `main`

#### GCP Cloud Run

```bash
gcloud run deploy seed-server \
  --image REGION-docker.pkg.dev/PROJECT/seed/seed-server:latest \
  --platform managed \
  --region asia-south1 \
  --port 8080 \
  --set-env-vars NODE_ENV=production,PORT=8080,FRONTEND_URL=https://yourdomain.com \
  --set-secrets DATABASE_URL=seed-db-url:latest,ACCESS_TOKEN_SECRET=seed-access-secret:latest
```

#### AWS ECS (Fargate)

1. Push image to ECR (step 2 above)
2. Create ECS task definition — container port `8080`, pass secrets via AWS Secrets Manager
3. Create ECS service with Application Load Balancer
4. Point Route 53 / CNAME to the ALB DNS

---

## Frontend Deployment (Vercel / Netlify)

### Vercel (recommended for Next.js)

1. Import the repo in the [Vercel dashboard](https://vercel.com/new)
2. Set **Root Directory** to `web`
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables:
   ```
   NEXT_PUBLIC_SERVER_BASE_URL=https://api.yourdomain.com
   NEXT_PUBLIC_AWS_S3_BUCKET_NAME=<bucket>
   NEXT_PUBLIC_AWS_REGION=<region>
   ```
5. Deploy. Every push to `main` redeploys automatically.

**Custom domain:** Vercel Dashboard → Project → Settings → Domains → Add domain → follow DNS instructions.

### Netlify

1. New site → Import from Git → select repo
2. Set **Base directory** to `web`
3. Build command: `pnpm build`
4. Publish directory: `.next`
5. Add the same three env vars above in Site Settings → Environment Variables
6. Enable the [Netlify Next.js plugin](https://docs.netlify.com/integrations/frameworks/next-js/overview/) for SSR support

**CORS note:** `FRONTEND_URL` on the server must exactly match the deployed frontend origin (no trailing slash). Update this env var after you know your Vercel/Netlify URL.

---

## CI/CD Pipeline

### Continuous integration — `.github/workflows/ci.yml`

This one exists in the repo. It runs on every push to `main` and every pull
request: install with a frozen lockfile, `pnpm build` (which generates the
Prisma client the typecheck depends on), `pnpm lint`, then `pnpm test`. A
Postgres 17 service container is attached so the integration suite under
`server/tests/integration/` runs rather than skipping.

Node is pinned to 24 to match `Dockerfile.server` and the `engines` floor —
Prisma does not support Node 25.

### Deployment — `.github/workflows/deploy.yml`

The workflow below is a **template**, not a file in this repo. Production
currently deploys through `fly deploy` using `fly.toml`, which runs migrations
in its `release_command`.

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build

  deploy-backend:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t seed-server:${{ github.sha }} -f Dockerfile.server .

      - name: Push to Docker Hub
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker tag seed-server:${{ github.sha }} ${{ secrets.DOCKER_USERNAME }}/seed-server:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/seed-server:latest

      - name: SSH deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull ${{ secrets.DOCKER_USERNAME }}/seed-server:latest
            docker stop seed-server || true
            docker rm seed-server || true
            docker run -d \
              --name seed-server \
              -p 8080:8080 \
              --env-file /home/deploy/.env \
              --restart unless-stopped \
              ${{ secrets.DOCKER_USERNAME }}/seed-server:latest

  deploy-frontend:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
          working-directory: ./web
```

**Required GitHub secrets:**

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password / token |
| `SERVER_HOST` | IP or hostname of your server |
| `SERVER_USER` | SSH user |
| `SSH_PRIVATE_KEY` | SSH private key for server access |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Database Management

### Run migrations

Migrations run as a release step, not on container start. To run them manually:

```bash
# Against a remote DB
DATABASE_URL="postgresql://..." pnpm --filter @seed/database db:deploy
```

### Before the next deploy: the 2026 hardening migrations

`main` contains only the `init` migration; this branch adds nine more (`20260822090000` through `20260905090000`). On Fly they run automatically as the `release_command` of the next deploy, so first:

1. **See what is pending** on the target database: `DATABASE_URL="postgresql://..." pnpm --filter @seed/database exec prisma migrate status`.
2. **Back up** (see Backups below). Prisma has no down migrations.
3. **Check what the last migration will touch.** `payment_allocation_foreign_keys` sets `invoiceId` / `billId` to NULL on any payment allocation whose document no longer exists, so that it can add foreign keys. Count them first:

   ```sql
   SELECT count(*) FROM payment_allocations pa
   WHERE (pa."invoiceId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sale_invoices si WHERE si.id = pa."invoiceId"))
      OR (pa."billId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = pa."billId"));
   ```

4. `costing_weighted_average_only` rebuilds the `CostingMethod` enum and briefly locks `businesses`. Any business set to FIFO becomes weighted average, which is what its books already used.
5. **After deploying**, run the reconciliation query in [HANDOVER.md](HANDOVER.md#reconcile-historical-books). Purchase returns, stock adjustments and damage reports confirmed before the posting fixes never reached the Inventory account.

### Rollback a migration

```bash
# Mark a specific migration as rolled back (does not auto-revert schema)
DATABASE_URL="postgresql://..." pnpm --filter @seed/database exec prisma migrate resolve \
  --rolled-back 20240101000000_migration_name
# Then restore from backup and re-deploy the previous image
```

### Backups

```bash
# Dump
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql "$DATABASE_URL" < backup_20260101_020000.sql
```

Use managed-DB automatic backups (Supabase/Neon/RDS all support point-in-time recovery) rather than manual dumps for production.

---

## Post-Deployment Checklist

- [ ] Server `/health` returns `200`
- [ ] Database migrations applied (`prisma migrate status`)
- [ ] All required env vars set (server exits on startup if any are missing)
- [ ] HTTPS working on both frontend and backend URLs
- [ ] `FRONTEND_URL` on server matches actual frontend origin exactly
- [ ] CORS: test that frontend can reach `/api` without errors
- [ ] OTP email sending works (trigger a login)
- [ ] Google OAuth redirect URI registered in Google Cloud Console (`https://api.yourdomain.com/api/auth.googleCallback`)
- [ ] S3 bucket CORS policy allows uploads from the frontend origin
- [ ] `TEST_MAIL` and `TEST_OTP` are **not** set in production
- [ ] Rate limiters active (OTP: 10 req/15 min, token refresh: 30 req/15 min)

---

## Rollback

### Backend

```bash
# Roll back to a specific image tag
docker stop seed-server && docker rm seed-server
docker run -d --name seed-server -p 8080:8080 --env-file .env \
  youruser/seed-server:v1.0.0
```

### Frontend

Vercel and Netlify both keep a deployment history. Go to the dashboard → Deployments → pick a previous build → **Promote to production**.
