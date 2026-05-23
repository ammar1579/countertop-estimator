# Google Cloud Launch Checklist

Commands are written for Google Cloud CLI. Run them from the app root unless stated otherwise:

```bash
cd /Users/a2025/Desktop/countertop-estimator/source
```

Official references:

- Cloud Build can build, push, and deploy an image to Cloud Run from `cloudbuild.yaml`: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run
- Cloud Run injects the `PORT` environment variable and defaults to port `8080`: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Cloud SQL MySQL databases can be created with `gcloud sql databases create`: https://docs.cloud.google.com/sql/docs/mysql/create-manage-databases
- Cloud Run Jobs can run one-off container tasks: https://docs.cloud.google.com/run/docs/create-jobs
- Cloud Run Jobs can be executed with `gcloud run jobs execute`: https://docs.cloud.google.com/run/docs/execute/jobs

## Domain Boundary

The public marketing website stays on Cloudways:

- `quickquartz.ca` remains on Cloudways.
- `www.quickquartz.ca` remains on Cloudways.
- Do not change the root/apex DNS records for `quickquartz.ca`.
- Do not change the `www` DNS records.

Only the app subdomain points to Google Cloud Run:

- `app.quickquartz.ca` maps to the Cloud Run service.
- Add only the DNS record Google provides for `app.quickquartz.ca`.

## 1. Set Project And Variables

```bash
gcloud auth login
gcloud config set project quick-quartz-app

export PROJECT_ID="$(gcloud config get-value project)"
export REGION="us-central1"
export SERVICE="countertop-estimator"
export REPOSITORY="countertop-estimator"
export IMAGE="app"
export INSTANCE="quick-quartz-db"
export DB_NAME="quickquartz"
export DB_USER="quickquartz"
export DB_PASSWORD="$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"
export ADMIN_EMAILS="YOUR_ADMIN_EMAIL@example.com"
export APP_DOMAIN="app.quickquartz.ca"
export DB_SECRET="countertop-estimator-database-url"
export JWT_SECRET_NAME="countertop-estimator-jwt-secret"
```

Use a URL-safe generated `DB_PASSWORD` as shown above so the MySQL URL does not need manual URL encoding.

## 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com
```

## 3. Create Artifact Registry

```bash
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Quick Quartz container images"
```

## 4. Create Cloud SQL MySQL

```bash
gcloud sql instances create "$INSTANCE" \
  --database-version=MYSQL_8_0 \
  --tier=db-custom-1-3840 \
  --region="$REGION" \
  --storage-type=SSD \
  --storage-size=20 \
  --storage-auto-increase \
  --backup-start-time=03:00
```

Create the app database and user:

```bash
gcloud sql databases create "$DB_NAME" \
  --instance="$INSTANCE" \
  --charset=utf8mb4 \
  --collation=utf8mb4_unicode_ci

gcloud sql users create "$DB_USER" \
  --instance="$INSTANCE" \
  --password="$DB_PASSWORD"
```

Capture the Cloud SQL connection name:

```bash
export CLOUDSQL_CONNECTION="$(gcloud sql instances describe "$INSTANCE" --format='value(connectionName)')"
echo "$CLOUDSQL_CONNECTION"
```

## 5. Store Secrets In Secret Manager

```bash
export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?socketPath=/cloudsql/${CLOUDSQL_CONNECTION}"
export JWT_SECRET="$(openssl rand -hex 32)"

printf '%s' "$DATABASE_URL" | gcloud secrets create "$DB_SECRET" \
  --data-file=- \
  --replication-policy=automatic

printf '%s' "$JWT_SECRET" | gcloud secrets create "$JWT_SECRET_NAME" \
  --data-file=- \
  --replication-policy=automatic
```

If the secrets already exist, add new versions instead:

```bash
printf '%s' "$DATABASE_URL" | gcloud secrets versions add "$DB_SECRET" --data-file=-
printf '%s' "$JWT_SECRET" | gcloud secrets versions add "$JWT_SECRET_NAME" --data-file=-
```

## 6. Create Runtime Service Account

```bash
gcloud iam service-accounts create countertop-estimator-run \
  --display-name="Countertop Estimator Cloud Run runtime"

export RUNTIME_SERVICE_ACCOUNT="countertop-estimator-run@${PROJECT_ID}.iam.gserviceaccount.com"
```

Grant runtime access to Cloud SQL and required secrets:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"

gcloud secrets add-iam-policy-binding "$DB_SECRET" \
  --member="serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding "$JWT_SECRET_NAME" \
  --member="serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## 7. Grant Cloud Build Deployment Access

```bash
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export CLOUD_BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SERVICE_ACCOUNT}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SERVICE_ACCOUNT}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CLOUD_BUILD_SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser"
```

If your organization uses the Compute Engine default service account for Cloud Build, repeat the same three role bindings for:

```bash
export COMPUTE_DEFAULT_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
```

## 8. Deploy To Cloud Run Through Cloud Build

Do not deploy until you are ready. When ready, run:

```bash
gcloud builds submit \
  --region="$REGION" \
  --config=cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_SERVICE="$SERVICE",_REPOSITORY="$REPOSITORY",_IMAGE="$IMAGE",_CLOUDSQL_INSTANCE="$CLOUDSQL_CONNECTION",_CORS_ORIGINS="https://${APP_DOMAIN}",_RUNTIME_SERVICE_ACCOUNT="$RUNTIME_SERVICE_ACCOUNT",_DB_SECRET="$DB_SECRET",_JWT_SECRET="$JWT_SECRET_NAME",_ADMIN_EMAILS="$ADMIN_EMAILS"
```

After deploy:

```bash
export SERVICE_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
curl "${SERVICE_URL}/health"
```

## 9. Run Production Migrations

Migrations are intentionally not run during service startup.

After the first image has been built and pushed, create or update a Cloud Run Job that runs the bundled migration script:

```bash
export IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE}:latest"

gcloud run jobs deploy countertop-estimator-migrate \
  --image="$IMAGE_URL" \
  --region="$REGION" \
  --service-account="$RUNTIME_SERVICE_ACCOUNT" \
  --set-cloudsql-instances="$CLOUDSQL_CONNECTION" \
  --set-secrets=DATABASE_URL="${DB_SECRET}:latest" \
  --set-env-vars=NODE_ENV=production \
  --command=node \
  --args=dist/scripts/migrate.js \
  --max-retries=0 \
  --task-timeout=10m

gcloud run jobs execute countertop-estimator-migrate \
  --region="$REGION" \
  --wait
```

Alternative local migration path through Cloud SQL Auth Proxy:

```bash
cloud-sql-proxy "$CLOUDSQL_CONNECTION" --port 3307
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:3307/${DB_NAME}" pnpm drizzle-kit migrate
```

## 10. First Admin Setup

Preferred first-admin path:

1. Set `ADMIN_EMAILS` to the owner email during deploy.
2. Keep `ALLOW_SIGNUPS=false` and `ALLOW_FIRST_USER_ADMIN=false`.
3. Register at `/login` using the owner email from `ADMIN_EMAILS`.
4. The account is created as `admin`.

If a user already exists and needs promotion, use the bundled promotion script with a Cloud Run Job:

```bash
export OWNER_EMAIL="owner@example.com"
export IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE}:latest"

gcloud run jobs deploy countertop-estimator-promote-admin \
  --image="$IMAGE_URL" \
  --region="$REGION" \
  --service-account="$RUNTIME_SERVICE_ACCOUNT" \
  --set-cloudsql-instances="$CLOUDSQL_CONNECTION" \
  --set-secrets=DATABASE_URL="${DB_SECRET}:latest" \
  --set-env-vars=NODE_ENV=production \
  --command=node \
  --args=dist/scripts/promote-admin.js,"$OWNER_EMAIL" \
  --max-retries=0 \
  --task-timeout=5m

gcloud run jobs execute countertop-estimator-promote-admin \
  --region="$REGION" \
  --wait
```

Local alternative through Cloud SQL Auth Proxy:

```bash
cloud-sql-proxy "$CLOUDSQL_CONNECTION" --port 3307
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:3307/${DB_NAME}" pnpm promote-admin owner@example.com
```

## 11. Connect A Custom Domain

Only map the app subdomain. Leave `quickquartz.ca` and `www.quickquartz.ca` on Cloudways.

```bash
export DOMAIN="app.quickquartz.ca"

gcloud beta run domain-mappings create \
  --service="$SERVICE" \
  --domain="$DOMAIN" \
  --region="$REGION"

gcloud beta run domain-mappings describe \
  --domain="$DOMAIN" \
  --region="$REGION"
```

Add only the DNS record returned for `app.quickquartz.ca` at your DNS provider. Do not edit root or `www` records.

Then verify:

```bash
curl "https://${DOMAIN}/health"
```

## Docker Verification

Docker Desktop is useful for local image testing, but it is not mandatory before the first Cloud Build deployment. Cloud Build builds the Docker image remotely from the submitted source or from the GitHub-connected repository, then pushes it to Artifact Registry and deploys it to Cloud Run.
