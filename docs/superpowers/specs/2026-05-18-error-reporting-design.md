# Error Reporting System Design Spec

## Goal

When a client-side error occurs in ERDify, automatically report it to the backend so the operations team can monitor, investigate, and resolve issues without waiting for user complaints.

Two outputs:
1. **DB storage** — all error types (5xx, network, 403, 404) persisted for admin review
2. **Email alert** — sent to `ADMIN_EMAILS` for 5xx and network errors only; 403/404 spike detection runs separately

---

## Architecture

```
Frontend error occurs
  → errorReporter.ts → POST /api/error-reports (fire-and-forget)

Backend
  → ErrorReportsModule
      ├─ save to DB (all types)
      ├─ send email if type = 5xx | network (via existing EmailService)
      └─ 403 spike check (cron every 5 min) → email if threshold exceeded

Admin UI
  → /admin/error-reports (inside dashboard shell)
  → visible only to ADMIN_EMAILS users
  → grouped by (errorType + path), slide-over detail, resolve with notes
```

---

## Backend

### Entity: `ErrorReport`

```
id            uuid PK
errorType     enum('5xx', 'network', '403', '404')
httpStatus    int nullable        -- e.g. 500, 403; null for network
path          varchar             -- e.g. POST /api/diagrams/create
url           varchar             -- full browser URL at time of error
userId        uuid nullable FK    -- null if unauthenticated
userAgent     varchar
resolvedAt    timestamp nullable
resolvedBy    uuid nullable FK    -- admin user who resolved
resolvedNote  text nullable
createdAt     timestamp
```

Grouped queries aggregate by `(errorType, path)` with count, `MIN(createdAt)` as firstSeen, `MAX(createdAt)` as lastSeen.

### Module: `ErrorReportsModule`

**`POST /api/error-reports`** — authenticated  
Request body: `{ errorType, httpStatus?, path, url, userAgent }`  
- Saves `ErrorReport` entity with `userId` from JWT
- If `errorType` is `5xx` or `network`: calls `EmailService.sendErrorAlert(report)`
- Returns `201` always (fire-and-forget — frontend ignores response)

**`GET /api/error-reports`** — admin only  
Query params: `type?, resolved?, from?, to?`  
Returns grouped results: `[{ errorType, path, count, firstSeen, lastSeen, resolved, occurrences[] }]`  
Admin check: compare `req.user.email` against `ADMIN_EMAILS` env var (comma-separated)

**`PATCH /api/error-reports/resolve`** — admin only  
Body: `{ path, errorType, note? }`  
Marks all matching unresolved reports as resolved (`resolvedAt = now, resolvedBy = req.user.id, resolvedNote`)

### 403 Spike Detection

NestJS `@Cron` every 5 minutes:
- Count `403` errors in the last 10 minutes
- If count ≥ `ERROR_SPIKE_THRESHOLD` (env var, default `5`): send one summary email
- Cooldown: don't re-alert within 30 minutes of last spike alert (store last alert time in memory or simple DB flag)

Same cron checks 404 spikes with same threshold.

### Email format

**Per-error alert (5xx / network):**
```
Subject: [ERDify] 서버 오류 — POST /api/diagrams/create
Body:
  에러 타입: 5xx (500)
  경로: POST /api/diagrams/create
  사용자: user#42
  발생 시각: 2026-05-18 14:32:11 KST
  브라우저: Chrome 124

  → 에러 리포트 확인: https://erdify.app/admin/error-reports
```

**Spike alert (403 / 404):**
```
Subject: [ERDify] 403 급증 감지 — 10분간 8건
Body:
  최근 10분간 403 오류 8건 발생 (임계값: 5건)
  가장 많이 발생한 경로: GET /api/diagrams/xxx (5회)

  → 에러 리포트 확인: https://erdify.app/admin/error-reports
```

---

## Frontend

### `errorReporter.ts`

`apps/web/src/shared/services/errorReporter.ts`

```ts
reportError(error: unknown, context: { path: string; url: string; userAgent: string }): void
```

- Determines `errorType` and `httpStatus` from the error shape (reuses `getErrorStatus` logic from `queryErrorContent.ts`)
- Extracts `path` from `error.config?.url` (Axios attaches the attempted URL even on network errors where no response arrives)
- Calls `POST /api/error-reports` fire-and-forget (catch swallowed — never throws to caller)
- Deduplication: skip if identical `(errorType, path)` was already reported within the last 60 seconds (in-memory Set, cleared on page unload)

### Integration points

`errorReporter.reportError()` is called from two places:

1. **`QueryErrorBoundary`** — inside `getDerivedStateFromError` static method (or in `componentDidCatch`)
2. **`DiagramGrid`** — in a `useEffect` watching `isError` transition from `false → true`

Both pass `path` as the API path extracted from the Axios error, `url` as `window.location.href`, `userAgent` as `navigator.userAgent`.

---

## Admin UI

### Route

`/admin/error-reports` — added to `Router.tsx` inside the `<ProtectedRoute>` tree, outside the `/:orgId` subtree to avoid route conflicts.

### Access control

`UnifiedSidebar` checks if `me.email` is in `ADMIN_EMAILS` env var (exposed as `VITE_ADMIN_EMAILS`). If yes, renders the admin section at the bottom. The route itself also checks on render (redirect to `/` if not admin).

### `ErrorReportsPage` layout

**Header:** page title + stat chips per error type with yesterday delta (`5xx: 3 ↑2`)

**Tab row:** "미해결 (N)" tab (default) | "해결됨" tab  
**Filter row:** type filter (전체 / 5xx / network / 403 / 404) + date shortcut (오늘 / 7일)

**Error list (grouped):**
Each row shows:
- Error type badge (color: red=5xx, orange=network, muted purple=403/404)
- API path
- `첫 발생: X / 최근: Y` timestamps
- Count badge (`×N`)
- "해결 →" button → opens slide-over

**403/404 spike banner:** shown above list when spike detected (from GET response flag)

**Slide-over (on "해결 →"):**
- Error type + path + httpStatus
- Count, firstSeen, lastSeen, affected user IDs, browsers
- Optional resolution note textarea
- "✓ 해결 완료로 표시" button
- Footer note: "해결자 및 시각이 자동 기록됩니다"

**해결됨 tab:** same layout, rows muted, shows `resolvedAt + resolvedBy + resolvedNote`

---

## Error Cases Matrix

| Error Type | DB | Email | Spike Alert |
|------------|----|-------|-------------|
| 5xx | ✓ | ✓ immediately | — |
| network | ✓ | ✓ immediately | — |
| 403 | ✓ | — | ✓ if ≥ threshold/10min |
| 404 | ✓ | — | ✓ if ≥ threshold/10min |

---

## Files Changed

| File | Change |
|------|--------|
| `packages/db/src/entities/error-report.entity.ts` | New entity |
| `apps/api/src/modules/error-reports/error-reports.module.ts` | New NestJS module |
| `apps/api/src/modules/error-reports/error-reports.controller.ts` | POST + GET + PATCH endpoints |
| `apps/api/src/modules/error-reports/error-reports.service.ts` | DB save, email trigger, spike cron |
| `apps/api/src/app.module.ts` | Register ErrorReportsModule |
| `shared/services/errorReporter.ts` | New — fire-and-forget reporter with dedup |
| `shared/components/QueryErrorBoundary.tsx` | Call `errorReporter.reportError()` in `componentDidCatch` |
| `features/dashboard/components/DiagramGrid.tsx` | Call `errorReporter.reportError()` on `isError` transition |
| `features/dashboard/components/UnifiedSidebar.tsx` | Conditional admin section for ADMIN_EMAILS users |
| `features/admin/pages/ErrorReportsPage.tsx` | New admin page |
| `features/admin/components/ErrorReportSlideOver.tsx` | Slide-over detail + resolve |
| `router/index.tsx` | Add `/admin/error-reports` route |

---

## Environment Variables

| Var | Description | Example |
|-----|-------------|---------|
| `ADMIN_EMAILS` | Comma-separated admin emails (backend) | `cartoonpoet@gmail.com` |
| `VITE_ADMIN_EMAILS` | Same for frontend sidebar visibility | `cartoonpoet@gmail.com` |
| `ERROR_SPIKE_THRESHOLD` | 403/404 count per 10 min to trigger spike alert | `5` |

---

## Testing

| File | Tests |
|------|-------|
| `error-reports.service.spec.ts` | Saves to DB; sends email for 5xx/network; no email for 403; spike cron triggers at threshold; cooldown prevents repeat alerts |
| `errorReporter.test.ts` | Calls POST on error; dedup suppresses duplicate within 60s; swallows fetch failure |
| `ErrorReportsPage.test.tsx` | Renders grouped list; slide-over opens on click; resolve marks item; non-admin redirected |

---

## Out of Scope (v1)

- CSV / JSON export
- Per-user error lookup filter
- Deployment event annotation
- Sentry integration
- Trend sparklines beyond daily delta
