# CI/CD Pipelines

This repository uses GitHub Actions workflows in `.github/workflows`:

- `ci.yml`: Continuous Integration (quality gates on PRs, `main`, and `develop`)
- `codeql.yml`: Static security analysis (CodeQL)
- `release.yml`: Build and publish release artifacts

## 1) CI (`ci.yml`)

### Triggers

- Pull requests (all branches)
- Pushes to `main` and `develop`

### Behavior

- Uses concurrency to cancel older in-progress runs on the same ref.
- Uses path filtering so frontend/backend jobs only run when relevant files change.

### Jobs

1. `changes`
- Detects whether `frontend/**`, `backend/**`, or workflow files changed.

2. `frontend` (runs only when frontend-related paths changed)
- Setup `pnpm` + Node.js 22 (with pnpm cache)
- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm build`
- Headless tests with Chrome:
  - `pnpm test -- --watch=false --browsers=ChromeHeadless --code-coverage`
- Uploads:
  - `frontend-coverage`
  - `frontend-dist`

3. `backend` (runs only when backend-related paths changed)
- Setup Java 25 (Temurin) + Maven cache
- `./mvnw spotless:check`
- `./mvnw test`
- `./mvnw -DskipTests package`
- Uploads:
  - `backend-test-reports`
  - `backend-jar`

4. `security`
- Dependency Review on pull requests
- Trivy filesystem vulnerability scan (HIGH/CRITICAL)
- Uploads SARIF findings to GitHub Security tab

## 2) CodeQL (`codeql.yml`)

### Triggers

- Pull requests
- Pushes to `main` and `develop`
- Weekly schedule (`cron`)

### Behavior

- Runs CodeQL analysis for:
  - `java-kotlin`
  - `javascript-typescript`
- Uses GitHub CodeQL autobuild and publishes findings in GitHub Security.

## 3) Release (`release.yml`)

### Triggers

- Push to `main` and `develop` (builds release-grade artifacts)
- Push tag matching `v*.*.*` (creates GitHub Release)
- Manual dispatch

### Behavior

1. `build-artifacts`
- Backend:
  - `spotless:check`
  - `test`
  - `package`
- Frontend:
  - `pnpm install --frozen-lockfile`
  - `pnpm format:check`
  - `pnpm build`
  - headless tests
- Packages:
  - backend jar(s)
  - `frontend-dist.tar.gz`
  - SHA-256 checksum files
- Uploads all as a single `release-assets` artifact.

2. `github-release` (tags only)
- Downloads `release-assets`
- Creates a GitHub Release
- Attaches:
  - `*.jar`
  - `*.tar.gz`
  - `*sha256.txt`

## Branch Protection Recommendations

Protect `main` and require:

1. `CI`
2. `CodeQL`

Protect `develop` and require:

1. `CI`
2. `CodeQL`

Also recommended:

1. Require pull request before merge
2. Require up-to-date branch before merge
3. Dismiss stale approvals on new commits

## Release Process

1. Merge changes into `main` or `develop` and ensure required checks are green.
2. Create and push a semantic version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

3. Wait for `Release` workflow to finish.
4. Download artifacts from the GitHub Release page.
5. Verify checksums before deployment.

## Notes

- CI currently enforces formatting checks; any formatting drift will fail pipeline.
- Java version in CI is pinned to 25 to match `backend/pom.xml`.
- Node version in CI is pinned to 22 for stable frontend builds.
