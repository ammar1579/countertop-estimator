# Deployment

This app is prepared for Google Cloud Run with Cloud SQL for MySQL.

Official Google references used for this setup:

- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud SQL for MySQL from Cloud Run: https://cloud.google.com/sql/docs/mysql/connect-run
- Cloud Build deployment to Cloud Run: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run

## Production Build

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

The build creates:

- `dist/index.js` for the Express server
- `dist/public` for the static frontend

## Cloud SQL

Create a Cloud SQL MySQL instance in the same region as Cloud Run where possible.

Cloud SQL connection name format:

```text
PROJECT_ID:REGION:INSTANCE
```

Cloud Run exposes the instance through a Unix socket at:

```text
/cloudsql/PROJECT_ID:REGION:INSTANCE
```

Use a `DATABASE_URL` secret like this:

```env
mysql://DB_USER:DB_PASSWORD@localhost/quickquartz?socketPath=/cloudsql/PROJECT_ID:REGION:INSTANCE
```

## Required Secrets

Create Secret Manager secrets:

```bash
printf '%s' 'mysql://DB_USER:DB_PASSWORD@localhost/quickquartz?socketPath=/cloudsql/PROJECT_ID:REGION:INSTANCE' \
  | gcloud secrets create quick-quartz-db-url --data-file=-

openssl rand -hex 32 \
  | gcloud secrets create quick-quartz-jwt-secret --data-file=-
```

If the secrets already exist:

```bash
printf '%s' 'mysql://DB_USER:DB_PASSWORD@localhost/quickquartz?socketPath=/cloudsql/PROJECT_ID:REGION:INSTANCE' \
  | gcloud secrets versions add quick-quartz-db-url --data-file=-

openssl rand -hex 32 \
  | gcloud secrets versions add quick-quartz-jwt-secret --data-file=-
```

## One-Time GCP Setup

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com

gcloud artifacts repositories create quick-quartz \
  --repository-format=docker \
  --location=us-central1
```

Grant Cloud Build deployment permissions to the Cloud Build service account:

```bash
PROJECT_ID="$(gcloud config get-value project)"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

## Deploy With Cloud Build

Edit substitutions in `cloudbuild.yaml`, especially:

- `_REGION`
- `_SERVICE`
- `_CLOUDSQL_INSTANCE`
- `_CORS_ORIGINS`
- `_RUNTIME_SERVICE_ACCOUNT`
- `_ADMIN_EMAILS`

Then run:

```bash
gcloud builds submit --region=us-central1 --config=cloudbuild.yaml
```

Cloud Run will send traffic to port `8080`, and the app listens on `0.0.0.0:${PORT}`.

## Run Migrations Against Production

Migrations are not run automatically on app startup. Use a Cloud Run Job with the production image:

```bash
IMAGE_URL="us-central1-docker.pkg.dev/PROJECT_ID/quick-quartz/app:latest"

gcloud run jobs deploy quick-quartz-migrate \
  --image="$IMAGE_URL" \
  --region=us-central1 \
  --service-account=quick-quartz-run@PROJECT_ID.iam.gserviceaccount.com \
  --set-cloudsql-instances=PROJECT_ID:us-central1:quick-quartz-db \
  --set-secrets=DATABASE_URL=quick-quartz-db-url:latest \
  --set-env-vars=NODE_ENV=production \
  --command=node \
  --args=dist/scripts/migrate.js \
  --max-retries=0 \
  --task-timeout=10m

gcloud run jobs execute quick-quartz-migrate --region=us-central1 --wait
```

Or run migrations from a trusted machine that can reach Cloud SQL. For a direct local run through Cloud SQL Auth Proxy:

```bash
cloud-sql-proxy PROJECT_ID:REGION:INSTANCE --port 3306
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/quickquartz pnpm drizzle-kit migrate
```

Seed default local/demo price lists only when appropriate:

```bash
mysql -h 127.0.0.1 -u DB_USER -p quickquartz < seed.sql
```

## First Admin

Preferred production setup:

1. Deploy with `_ADMIN_EMAILS=owner@example.com`.
2. Keep `ALLOW_SIGNUPS=false` and `ALLOW_FIRST_USER_ADMIN=false`.
3. Register at `/login` with the owner email.
4. The matching account is created with the `admin` role.

If the user already exists, promote it with the bundled script:

```bash
DATABASE_URL=mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/quickquartz pnpm promote-admin owner@example.com
```

For a Cloud Run Job version, use `GOOGLE_CLOUD_LAUNCH_CHECKLIST.md`.

## Post-Deploy Checks

```bash
SERVICE_URL="$(gcloud run services describe quick-quartz-app --region=us-central1 --format='value(status.url)')"
curl "${SERVICE_URL}/health"
```

Then open the service URL, register the first admin if intentionally enabled, and immediately disable public signups for production.
