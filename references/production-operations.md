# AromaNet Production Operations

## Current Production Status

`https://aromanet.club/` is connected to Manus and the production API/DB is reachable.

Smoke-tested production capabilities:

- Store, therapist, and customer login
- Store/therapist search
- Customer reservation creation
- Store reservation status updates
- Review creation
- Message thread creation and send/read
- Therapist shift creation
- Store menu and room create/delete
- Sales summary
- Payroll calculation/list
- Salary notification

## Required Secrets

Use `.env.production.example` as the source of truth. Do not place real secrets in the repo.

Minimum required values:

- `DATABASE_URL`
- `JWT_SECRET`

Recommended values:

- `OWNER_OPEN_ID`
- `OAUTH_SERVER_URL`

Optional values:

- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`

## Formal Account Setup

Set the appropriate `PROD_*` environment variables, then dry-run first:

```bash
pnpm prod:setup-accounts
```

Apply changes:

```bash
pnpm prod:setup-accounts --apply
```

Rotate passwords for existing accounts only when intentionally needed:

```bash
pnpm prod:setup-accounts --apply --rotate-passwords
```

Passwords must be at least 12 characters. The script never prints passwords.

## Smoke-Test Data Cleanup

Preview rows that match smoke-test markers:

```bash
pnpm prod:cleanup-smoke
```

Delete matching rows:

```bash
pnpm prod:cleanup-smoke --apply --recalculate-payroll
```

Default markers:

- `本番動作確認`
- `動作確認`

Override markers:

```bash
SMOKE_DATA_MARKERS="本番動作確認,別マーカー" pnpm prod:cleanup-smoke
```

The cleanup script targets marked rows in:

- reservations
- reviews
- messages
- posts
- shifts
- notifications
- menus
- rooms

It also removes dependent reservation options and sales for marked reservations, adjusts customer total spend downward, and can recalculate affected payroll rows when `--recalculate-payroll` is passed.

## Admin API Hardening

Admin report/audit/suspend actions are restricted to the Manus-authenticated admin user via `adminProcedure`.

Admin-only procedures:

- `admin.getReports`
- `admin.getAuditLogs`
- `admin.previewSmokeData`
- `admin.purgeSmokeData`
- `admin.resolveReport`
- `admin.suspendAccount`

Role-user verification submissions remain available to the relevant logged-in AromaNet role.

## Health Checks

Use:

- `/api/health` for process liveness
- `/api/ready` for DB-backed readiness

`/api/ready` should return HTTP 503 when the database is unavailable.
