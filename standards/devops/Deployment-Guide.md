# Development & Deployment Guide (v1.0)

*If a new engineer cannot get the application running in under 15 minutes using this guide, the guide has failed.*

| System | Repository | CI/CD Platform | Hosting |
|---|---|---|---|
| `[System Name]` | `[Repository URL]` | `[GitHub Actions / GitLab CI / etc.]` | `[Vercel / Render / AWS / Azure / etc.]` |

---

## 1. Purpose

Provide a consistent process for setting up a development environment and deploying applications through the project's CI/CD pipeline.

---

## 2. Prerequisites

Specify exact versions where applicable.

- Node.js `v20.x`
- Package Manager (e.g., `pnpm v8.x`)
- Docker Desktop
- Git
- Required CLI tools (if any)

---

## 3. Development Environment Setup

1. Clone the repository.
2. Install project dependencies.
3. Start required infrastructure (Database, Redis, etc.).
4. Copy `.env.example` to `.env`.
5. Configure local environment variables.
6. Run database migrations.
7. Seed development data (if applicable).
8. Start the development server.
9. Verify the application is running successfully.

---

## 4. Environment Variables

Document required variables only.

Never commit real secrets.

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Database connection | `postgres://...` |
| `API_BASE_URL` | API endpoint | `http://localhost:3000` |
| `APP_ENV` | Application environment | `development` |

Secrets should be managed using the project's approved secret management solution.

---

## 5. CI/CD Pipeline

Describe how code moves through environments.

### Pull Request

- Run automated quality checks.
- Execute automated tests.
- Build application.
- Deploy preview environment (if supported).

### Main Branch

- Execute CI pipeline.
- Deploy application.
- Run database migrations (if applicable).
- Publish release artifacts (if applicable).

Prefer fully automated deployments whenever practical.

---

## 6. Deployment Verification

After every deployment, verify:

- [ ] Application starts successfully.
- [ ] Database migrations completed.
- [ ] Health endpoint is healthy.
- [ ] Critical user journey works.
- [ ] Monitoring shows no critical errors.

---

## 7. References

- System Design
- API Specification
- Runbook

---

## 8. Engineering Governance

- Automate deployments whenever practical.
- Every deployment must be repeatable.
- Never commit secrets to the repository.
- Every production deployment must have a documented rollback strategy.

---

**Changelog:** Tracked via Git history.