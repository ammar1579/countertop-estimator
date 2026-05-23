# Staging Deployment Plan

This plan prepares the first Google Cloud Run staging deployment for the GitHub repo:

```text
https://github.com/ammar1579/countertop-estimator
```

Do not run the deploy commands until you are ready to create staging cloud resources.

## Recommended Staging Names

Use these names consistently:

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
export SERVICE="countertop-estimator-staging"
export REPOSITORY="countertop-estimator"
export IMAGE="app"
export INSTANCE="countertop-estimator-staging-db"
export DB_NAME="countertop_estimator_staging"
export DB_USER="countertop_staging"
export RUNTIME_SA_NAME="countertop-estimator-staging-run"
export RUNTIME_SERVICE_ACCOUNT="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
export DB_SECRET="countertop-estimator-staging-db-url"
export JWT_SECRET_NAME="countertop-estimator-staging-jwt-secret"
export MIGRATION_JOB="countertop-estimator-staging-migrate"
export PROMOTE_ADMIN_JOB="countertop-estimator-staging-promote-admin"
export ADMIN_EMAILS="YOUR_ADMIN_EMAIL@example.com"
```

Recommended staging URL:

- First deploy: use the generated Cloud Run URL from `gcloud run services describe`.
- If you own a domain: map `staging.countertop-estimator.com` later.

## Placeholder Values To Replace

Replace these before running commands:

- `YOUR_GCP_PROJECT_ID`
- `YOUR_ADMIN_EMAIL@example.com`
- `staging.countertop-estimator.com` if you choose a custom domain

## 1. Authenticate And Select Project

```bash
gcloud auth login
gcloud config set project "$PROJECT_ID"
gcloud config get-value project
```

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
  --description="Countertop Estimator staging images"
```

If it already exists:

```bash
gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION"
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

Create the staging database and user:

```bash
export DB_PASSWORD="$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"

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

## 5. Store Staging Secrets

```bash
export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?socketPath=/cloudsql/${CLOUDSQL_CONNECTION}"
export APP_JWT_SECRET="$(openssl rand -hex 32)"

printf '%s' "$DATABASE_URL" | gcloud secrets create "$DB_SECRET" \
  --data-file=- \
  --replication-policy=automatic

printf '%s' "$APP_JWT_SECRET" | gcloud secrets create "$JWT_SECRET_NAME" \
  --data-file=- \
  --replication-policy=automatic
```

If secrets already exist, add versions instead:

```bash
printf '%s' "$DATABASE_URL" | gcloud secrets versions add "$DB_SECRET" --data-file=-
printf '%s' "$APP_JWT_SECRET" | gcloud secrets versions add "$JWT_SECRET_NAME" --data-file=-
```

## 6. Create Runtime Service Account

```bash
gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
  --display-name="Countertop Estimator staging runtime"
```

Grant runtime access:

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

## 7. Grant Cloud Build Access

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

## 8. Build And Deploy Staging With Cloud Build

Docker does not need to be installed locally for this path. Cloud Build builds the Docker image remotely.

The first deploy uses a temporary `CORS_ORIGINS` value. This is enough for `/health`; update it to the generated service URL in step 9 before using login or registration.

```bash
gcloud builds submit \
  --region="$REGION" \
  --config=cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_SERVICE="$SERVICE",_REPOSITORY="$REPOSITORY",_IMAGE="$IMAGE",_CLOUDSQL_INSTANCE="$CLOUDSQL_CONNECTION",_CORS_ORIGINS="https://staging.countertop-estimator.com",_RUNTIME_SERVICE_ACCOUNT="$RUNTIME_SERVICE_ACCOUNT",_ADMIN_EMAILS="$ADMIN_EMAILS"
```

## 9. Capture Service URL And Fix CORS

```bash
export SERVICE_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
echo "$SERVICE_URL"

gcloud run services update "$SERVICE" \
  --region="$REGION" \
  --update-env-vars=CORS_ORIGINS="$SERVICE_URL"
```

Verify health:

```bash
curl "${SERVICE_URL}/health"
```

## 10. Run Staging Migrations

Migrations are not run automatically on app startup.

```bash
export IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE}:latest"

gcloud run jobs deploy "$MIGRATION_JOB" \
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

gcloud run jobs execute "$MIGRATION_JOB" \
  --region="$REGION" \
  --wait
```

## 11. Create First Staging Admin

Preferred path:

1. Confirm `ADMIN_EMAILS="$ADMIN_EMAILS"` was used during deploy.
2. Open `$SERVICE_URL/login`.
3. Register with the exact email in `ADMIN_EMAILS`.
4. The account will be created as `admin`.

If the account already exists and needs promotion:

```bash
export OWNER_EMAIL="$ADMIN_EMAILS"

gcloud run jobs deploy "$PROMOTE_ADMIN_JOB" \
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

gcloud run jobs execute "$PROMOTE_ADMIN_JOB" \
  --region="$REGION" \
  --wait
```

## 12. Optional GitHub-Connected Cloud Build Verification

Cloud Build can build remotely from GitHub after the repo is connected. This also means Docker does not need to be installed locally.

Create a manual-approval staging trigger later:

```bash
gcloud builds triggers create github \
  --name="countertop-estimator-staging" \
  --repo-owner="ammar1579" \
  --repo-name="countertop-estimator" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --region="$REGION" \
  --require-approval
```

Use manual approval for staging until the deployment process is proven.

## 13. Optional Custom Domain

If you own `countertop-estimator.com`, map:

```bash
export DOMAIN="staging.countertop-estimator.com"

gcloud beta run domain-mappings create \
  --service="$SERVICE" \
  --domain="$DOMAIN" \
  --region="$REGION"

gcloud beta run domain-mappings describe \
  --domain="$DOMAIN" \
  --region="$REGION"
```

After DNS is active, update CORS:

```bash
gcloud run services update "$SERVICE" \
  --region="$REGION" \
  --update-env-vars=CORS_ORIGINS="https://${DOMAIN}"
```
