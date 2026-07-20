# Auth Proxy And Password Change Design

Date: 2026-07-20
Status: Approved design, pending written-spec review

## Context

Tunnel Manager consists of:

- Next.js frontend at `/home/kuon/code/tunnel-manager-fe`
- Go/Gin backend at `/home/kuon/code/tunnel-manager`

Backend already supports public `POST /api/auth/login`, JWT generation, an admin row, and JWT middleware code. Domain routes do not currently attach that middleware. Frontend calls backend directly from browser through `NEXT_PUBLIC_API_BASE_URL`, has no login UI, stores no session, and sends no bearer token.

This design completes authentication across both applications. Browser communicates only with same-origin Next.js route handlers. Next.js stores backend JWT in an `HttpOnly` cookie and proxies authenticated API requests to backend. Backend protects domain routes and supports password change with immediate revocation of all older JWTs.

## Goals

- Require valid, current JWT for every `/api/domains/*` backend request.
- Add frontend login, logout, protected navigation, and password-change flows.
- Keep JWT inaccessible to browser JavaScript.
- Proxy every browser-to-backend API call through Next.js.
- Configure backend location with server-only frontend environment variable `API_BASE_URL`.
- Let admin change password while preserving current browser session through newly issued JWT.
- Revoke every previously issued JWT immediately after password change.
- Preserve changed password across backend restarts.
- Fix frontend update-origin request body to match backend `origin_url` contract.

## Non-goals

- No refresh token.
- No public registration.
- No password reset or recovery flow.
- No RBAC or multiple account management.
- No remember-me option.
- No cross-device session list or selective revocation.
- No backend logout endpoint; frontend logout deletes local session cookie.
- No broad frontend or backend architecture refactor.

## Decisions

### Session storage

Next.js stores backend JWT in cookie with:

- `HttpOnly`
- `SameSite=Lax`
- `Secure` in production
- `Path=/`
- expiry matching backend `expiresAt`

Browser JavaScript never receives or reads JWT.

### Backend access

Browser never calls backend directly. Browser calls same-origin Next.js endpoints. Next.js route handlers read server-only `API_BASE_URL`, forward requests, and attach `Authorization: Bearer <token>`.

Frontend environment changes from:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8180
```

to:

```env
API_BASE_URL=http://localhost:8180
```

`API_BASE_URL` must not use `NEXT_PUBLIC_` prefix.

### Password change

Password change requires current password. New password must:

- contain 12–72 bytes after UTF-8 encoding
- differ from current password

Successful change increments account `token_version`, invalidating every old JWT, then issues a new JWT using new version. Next.js replaces current session cookie with new JWT, preserving current browser session.

### Admin bootstrap

`ADMIN_USERNAME` and `ADMIN_PASSWORD` create admin only when configured username does not exist. Startup never overwrites password of existing admin. Password changed through UI therefore survives restart.

## Backend Design

### Data model and migration

Add `TokenVersion int64` to `model.Auth`:

```go
TokenVersion int64 `bun:"token_version,notnull,default:1" json:"-"`
```

Add Goose migration after current `00002_create_auths.sql`:

```sql
-- +goose Up
ALTER TABLE auths ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;

-- +goose Down
ALTER TABLE auths DROP COLUMN token_version;
```

SQLite version used by deployment must support `ALTER TABLE ... DROP COLUMN`. If existing supported SQLite floor does not, down migration rebuilds table instead. Up migration remains additive and preserves existing admin with version `1`.

### JWT claims

JWT remains HS256. Claims include:

- `sub`: username
- `iat`: issuance time
- `exp`: expiry time
- `tokenVersion`: account token version

JWT API becomes version-aware:

```go
func GenerateToken(secret []byte, username string, tokenVersion int64, ttl time.Duration) (token string, expiresAt time.Time, err error)
func ParseToken(secret []byte, tokenString string) (username string, tokenVersion int64, err error)
```

Parsing accepts only HMAC signing and requires non-empty subject, valid expiry, and positive token version.

### Login

`POST /api/auth/login` stays public.

Request:

```json
{"username":"admin","password":"..."}
```

Response:

```json
{"token":"...","expiresAt":"2026-07-27T12:00:00Z"}
```

Service loads admin, compares bcrypt hash, and signs JWT with row `TokenVersion`. Unknown username and wrong password both return `401 {"error":"invalid credentials"}`.

### Authentication middleware

Domain route group attaches repository-aware middleware. Middleware:

1. Requires exact `Authorization: Bearer <token>` shape.
2. Parses and validates JWT signature and registered claims.
3. Loads account by JWT subject.
4. Compares DB `TokenVersion` to JWT `tokenVersion`.
5. Stores authenticated username in Gin context for password-change handler.
6. Returns generic `401 {"error":"unauthorized"}` for missing, malformed, expired, unknown-user, or revoked token.

Repository lookup is required because immediate revocation cannot remain stateless. Middleware receives an auth service/interface rather than querying Bun directly, preserving route to service to repository dependency direction.

Apply middleware to:

- `/api/domains`
- authenticated auth routes, currently password change

Do not apply it to `/api/auth/login`.

### Password-change endpoint

Add authenticated `PUT /api/auth/password`.

Request:

```json
{
  "currentPassword": "...",
  "newPassword": "..."
}
```

Success response uses same shape as login:

```json
{"token":"...","expiresAt":"2026-07-27T12:00:00Z"}
```

Service flow:

1. Load authenticated account.
2. Compare `currentPassword` against bcrypt hash.
3. Validate `newPassword` UTF-8 byte length is 12–72.
4. Reject same password by comparing new password against current hash.
5. Generate new bcrypt hash.
6. Set hash, increment `TokenVersion`, update `UpdatedAt`.
7. Persist update atomically in one repository update.
8. Issue JWT using incremented version.

Errors:

- invalid JSON or password outside 12–72 bytes: `400`
- wrong current password: `401 {"error":"invalid credentials"}`
- new password equals current password: `400`
- missing, invalid, expired, or revoked JWT: `401 {"error":"unauthorized"}`
- persistence/signing failure: `500` with generic public message; detailed error remains server-side

No password value appears in logs or returned errors.

### Bootstrap behavior

When configured admin username is absent, bootstrap creates row with bcrypt hash and `TokenVersion: 1`.

When row exists, bootstrap does nothing. It does not compare or replace password from `ADMIN_PASSWORD`. README documents `ADMIN_PASSWORD` as initial provisioning value only.

## Frontend Design

### Application routing and shell

Add public `/login` page outside authenticated app shell. Existing domain pages remain protected.

Root layout keeps global fonts/providers/toaster only. Authenticated shell moves into route group layout so login page does not render sidebar. URL paths remain unchanged:

- `/login`
- `/`
- `/domains/[id]`

Root-level `proxy.ts`, required by Next.js 16 conventions, checks presence of session cookie for page navigation:

- no cookie on protected page: redirect to `/login`
- cookie present on `/login`: redirect to `/`

This check is navigation optimization only. It does not validate JWT. Backend remains source of truth.

### Next.js route handlers

Use focused handlers:

- `POST /api/session/login`: forward credentials to backend login, set session cookie, return success without JWT
- `DELETE /api/session`: delete session cookie
- `PUT /api/session/password`: forward password change with bearer JWT, replace cookie from backend response, return success without JWT
- `/api/backend/[...path]`: proxy domain API requests with bearer JWT

Shared server-only helper owns:

- session cookie name/options
- `API_BASE_URL` validation and backend URL construction
- backend fetch
- response forwarding
- bearer header injection
- cookie set/delete

`API_BASE_URL` is parsed with `new URL()`. Missing, malformed, or non-HTTP(S) values produce generic `500 {"error":"server configuration error"}`. Backend URL and internal exception details are not returned to browser.

### API proxy semantics

Domain proxy forwards:

- HTTP method
- path after `/api/backend`
- query string
- request body for methods that allow one
- backend response status
- backend response body
- backend `Content-Type`

Proxy does not forward browser `Cookie`, `Host`, `Origin`, or arbitrary authorization headers to backend. It creates backend `Authorization` solely from server cookie. It forwards JSON request content type where present.

Backend `401` causes proxy to delete session cookie before returning `401`.

Mutation handlers enforce same-origin requests by comparing `Origin` with request URL origin. Missing or mismatched origin on browser mutation requests returns `403`. Login, logout, password change, and proxied non-GET/HEAD domain requests use this check.

### Client API

`lib/api.ts` base URL becomes `/api/backend`; remove public backend environment access.

Domain methods retain current shape except update origin sends backend-compatible payload:

```json
{"origin_url":"..."}
```

Axios response interceptor handles `401` by navigating browser to `/login`. It does not inspect or manage JWT.

Session client methods call:

- `POST /api/session/login`
- `DELETE /api/session`
- `PUT /api/session/password`

### Login UI

Login form contains username and password. Behavior:

- disables submit while pending
- displays backend invalid-credentials error without revealing which field failed
- redirects to `/` after success
- preserves no JWT in React state, storage, URL, or response body

### Password-change UI

Sidebar exposes Change password action and Logout action.

Change-password dialog contains:

- current password
- new password
- confirm new password

Client validates confirmation equality and 12–72 UTF-8 byte length before submit. Backend repeats all trust-boundary validation. On success, dialog closes and current session continues using replaced cookie.

### Logout UI

Logout calls `DELETE /api/session`, clears React Query cache, then redirects to `/login`. No backend logout call exists because revocation of current token alone is not represented by backend data model.

## Error Handling

- Backend unavailable: Next.js returns `502 {"error":"backend unavailable"}`.
- Missing session cookie on authenticated Next.js endpoint: `401 {"error":"unauthorized"}`.
- Backend `401`: delete cookie, return generic unauthorized response, redirect client to login.
- Backend validation errors safe for operators may pass through unchanged.
- Unexpected backend/proxy failures return generic errors; no token, password, backend URL, stack trace, or raw internal error reaches browser.
- Metrics text and JSON responses preserve backend content type and body.

## Security Requirements

- JWT stored only in `HttpOnly` cookie.
- Cookie uses `Secure` in production and `SameSite=Lax` everywhere.
- Session endpoints never return JWT to browser.
- Browser-provided authorization header is ignored by backend proxy.
- Every backend domain route validates token version against DB.
- Passwords use bcrypt and never enter logs.
- Password length measured in bytes because bcrypt input ceiling is 72 bytes.
- Mutation requests require same origin.
- Error messages prevent username enumeration and avoid secret leakage.
- `API_BASE_URL` remains server-only.

## Testing Strategy

### Backend

Use Go standard `testing` and Gin/HTTP test facilities.

Required tests:

- JWT round trip preserves username and token version.
- JWT rejects wrong secret, expired token, unexpected algorithm, missing subject, and invalid token version.
- Login signs current DB token version.
- Middleware rejects missing, malformed, expired, unknown-user, and stale-version tokens.
- Middleware accepts matching version and exposes username.
- Password change rejects wrong current password.
- Password change rejects new password shorter than 12 bytes or longer than 72 bytes.
- Password change accepts multibyte password only when encoded byte length is within range.
- Password change rejects same password.
- Successful change updates hash, increments version, rejects old JWT, and accepts new JWT.
- Bootstrap creates absent admin with version 1.
- Bootstrap leaves existing password and token version unchanged.
- Domain route group requires authentication.

### Frontend

Use already-installed/native test capability where available. Do not add a test framework solely for trivial wrappers. Non-trivial proxy logic must leave runnable checks covering:

- cookie options and expiry
- login strips JWT and sets cookie
- password change rotates cookie and strips JWT
- logout deletes cookie
- backend proxy adds bearer header from cookie
- browser authorization header is not forwarded
- path/query/method/body/status/content-type forwarding
- backend `401` deletes cookie
- same-origin mutation enforcement
- missing or malformed `API_BASE_URL`
- update-origin request uses `origin_url`

Also run frontend lint/build and backend full test/build suites.

## Deployment And Configuration

Frontend `.env.local.example`:

```env
# Server-only backend URL used by Next.js route handlers.
API_BASE_URL=http://localhost:8180
```

Existing local `.env.local` receives same key. Remove `NEXT_PUBLIC_API_BASE_URL` usage.

Backend keeps:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` as first-run seed only
- `JWT_SECRET`
- `JWT_TTL`

Deployment order:

1. Apply backend migration.
2. Deploy backend with authenticated routes and password-change endpoint.
3. Deploy frontend configured with server-only `API_BASE_URL`.
4. Log in using seeded/current admin password.
5. Change password through UI if initial env password must be rotated.

Deploy backend and frontend together during maintenance window because protecting domain routes breaks old frontend direct calls.

## Compatibility And Migration

- Existing auth row receives `token_version = 1` automatically.
- JWTs issued before deployment lack `tokenVersion` and become invalid.
- Existing browser has no session cookie and is redirected to login.
- Existing domain data remains unchanged.
- CORS becomes unnecessary for browser domain calls because Next.js performs server-to-server requests, but backend CORS support remains unchanged for operational clients.
- Frontend update-origin request changes from `originUrl` to `origin_url`, matching current backend request DTO.

## Success Criteria

- Unauthenticated backend domain requests return `401`.
- Valid current JWT permits domain operations.
- Browser never receives backend JWT in JavaScript-visible response or storage.
- Browser sends domain operations only to same-origin Next.js proxy.
- Frontend reads backend location only from server-only `API_BASE_URL`.
- Login creates secure session cookie and opens domain UI.
- Logout removes session cookie and returns to login.
- Password change requires current password and 12–72-byte new password.
- Password change keeps current browser logged in using newly issued JWT.
- Every older JWT fails immediately after password change.
- Changed password survives backend restart.
- Logs and metrics still render through proxy.
- Frontend lint/build and backend test/build pass.
