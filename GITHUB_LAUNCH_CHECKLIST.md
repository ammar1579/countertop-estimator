# GitHub Launch Checklist

Run these commands from the app root:

```bash
cd /Users/a2025/Desktop/countertop-estimator/source
git status --short --branch
```

The working tree should be clean before pushing.

## 1. Create The GitHub Repo

Option A: GitHub web UI

1. Go to https://github.com/new.
2. Repository name: `countertop-estimator` or `quick-quartz-app`.
3. Visibility: start with **Private**.
4. Do not initialize with README, `.gitignore`, or license because this repo already has them.
5. Create the repository.

Option B: GitHub CLI

```bash
gh auth login
gh repo create YOUR_GITHUB_ORG_OR_USER/countertop-estimator --private --source=. --remote=origin
```

## 2. Add The Remote

Skip this if `gh repo create --source=. --remote=origin` already added it.

```bash
git remote add origin git@github.com:YOUR_GITHUB_ORG_OR_USER/countertop-estimator.git
git remote -v
```

HTTPS alternative:

```bash
git remote add origin https://github.com/YOUR_GITHUB_ORG_OR_USER/countertop-estimator.git
git remote -v
```

## 3. Push `main`

```bash
git branch --show-current
git push -u origin main
```

## 4. Branch Protection Later

After the first push, configure branch protection in GitHub:

1. Go to repository Settings -> Branches.
2. Add a rule for `main`.
3. Enable "Require a pull request before merging".
4. Enable "Require status checks to pass before merging" after CI exists.
5. Enable "Require branches to be up to date before merging" after CI exists.
6. Enable "Do not allow bypassing the above settings" for production teams.

Suggested future required checks:

```text
pnpm check
pnpm test
pnpm build
```

## 5. Where Secrets Go

Do not put production secrets in GitHub repository files.

Use:

- Google Secret Manager for `DATABASE_URL` and `JWT_SECRET`.
- GitHub Actions repository secrets only if/when CI/CD needs them.
- Local `.env` for local development only.

Potential GitHub Actions secrets later:

```text
GCP_PROJECT_ID
GCP_WORKLOAD_IDENTITY_PROVIDER
GCP_SERVICE_ACCOUNT
```

## 6. What Not To Commit

Never commit:

- `.env`
- `.env.*` except `.env.example`
- `node_modules/`
- `dist/`
- Cloud SQL local sockets or database files
- logs such as `*.log` or `pnpm-debug.log*`
- service account JSON keys
- copied `DATABASE_URL` values
- copied `JWT_SECRET` values
- customer quotes, client data, or exports

Confirm ignored files before pushing:

```bash
git status --short --ignored -- .env node_modules dist
```

Expected: ignored entries begin with `!!`.

## 7. Pre-Push Verification

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

Docker verification is still pending on this Mac because Docker is not installed.
