# Auth Proxy And Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect backend domain APIs with revocable JWT auth and make Next.js own browser sessions, backend proxying, login, logout, and password change.

**Architecture:** Go backend remains source of truth for credentials and JWT validity. Next.js acts as backend-for-frontend: route handlers keep JWT in an `HttpOnly` cookie and proxy browser requests to server-only `API_BASE_URL`. Password change increments persisted token version, revoking all old JWTs while returning one replacement JWT for current browser.

**Tech Stack:** Go 1.24, Gin, Bun/SQLite, Goose, `golang-jwt/jwt/v5`, bcrypt, Next.js 16 App Router, React 19, Axios, TanStack Query, Node native test runner.

## Global Constraints

- Browser must never receive JWT in JavaScript-visible response, storage, or URL.
- Frontend backend URL must be server-only `API_BASE_URL=http://localhost:8180`; remove `NEXT_PUBLIC_API_BASE_URL` usage.
- New passwords must contain 12–72 UTF-8 bytes and differ from current password.
- Password change must revoke every older JWT immediately and replace current browser cookie with newly issued JWT.
- `ADMIN_PASSWORD` provisions absent admin only; backend restart must not overwrite changed password.
- Browser domain calls must use same-origin `/api/backend/*`; no direct browser-to-backend requests.
- Preserve unrelated dirty changes in both repositories. Stage or commit only task-owned hunks/files; do not discard user work.
- Keep current backend route → service → repository boundaries and current `fx` wiring.
- Use TDD: run each new test red before production edit, then green after minimum edit.

---

## File Map

### Backend: `/home/kuon/code/tunnel-manager`

- `migrations/00003_add_auth_token_version.sql`: additive token-version schema.
- `internal/model/auth.go`: persisted token version.
- `internal/pkg/jwt/jwt.go`: versioned JWT claims and parsing.
- `internal/pkg/jwt/jwt_test.go`: JWT behavior.
- `internal/services/auth/service.go`: auth service contract, authentication, password change.
- `internal/services/auth/login.go`: issue versioned JWT.
- `internal/services/auth/bootstrap.go`: seed absent admin only.
- `internal/services/auth/change_password.go`: validate/change/rotate token.
- `internal/services/auth/service_test.go`: login, bootstrap, password-change behavior.
- `internal/pkg/request/auth/change_password.go`: password request DTO.
- `internal/pkg/middleware/auth.go`: parse bearer token and delegate account-version validation.
- `internal/pkg/middleware/auth_test.go`: middleware status/context behavior.
- `internal/application/api/route/auth/route.go`: public login and protected password route groups.
- `internal/application/api/route/auth/change_password.go`: password-change HTTP handler.
- `internal/application/api/route/domain/route.go`: attach JWT middleware to all domain routes.
- `internal/application/api/route/domain/route_test.go`: route auth boundary.
- `README.md`: auth/password/bootstrap operator contract.

### Frontend: `/home/kuon/code/tunnel-manager-fe`

- `.env.local.example`: server-only backend URL example.
- `.env.local`: local server-only backend URL.
- `lib/server/session-options.ts`: pure cookie-option builder for native tests.
- `lib/server/session.ts`: cookie constants/options/set/delete.
- `lib/server/backend-core.ts`: pure URL/origin/header/response helpers for native tests.
- `lib/server/backend.ts`: URL validation, same-origin guard, authenticated backend fetch/response forwarding.
- `lib/server/backend.test.ts`: runnable Node checks for server proxy helpers.
- `app/api/session/login/route.ts`: login BFF endpoint.
- `app/api/session/route.ts`: logout BFF endpoint.
- `app/api/session/password/route.ts`: password-change BFF endpoint.
- `app/api/backend/[...path]/route.ts`: authenticated generic backend proxy.
- `proxy.ts`: page navigation redirects based on cookie presence.
- `app/layout.tsx`: global-only root layout.
- `app/(authenticated)/layout.tsx`: sidebar shell.
- `app/(authenticated)/page.tsx`: existing domains page moved without URL change.
- `app/(authenticated)/domains/[id]/page.tsx`: existing detail page moved without URL change.
- `app/login/page.tsx`: login UI.
- `components/login-form.tsx`: login mutation/form.
- `components/change-password-dialog.tsx`: password-change form.
- `components/app-sidebar.tsx`: password-change and logout actions.
- `lib/api.ts`: same-origin backend base path, `originUrl`, session methods, `401` redirect.
- `README.md`: frontend env and auth flow.
- `package.json`: native test script only; no new dependency.

---

### Task 1: Versioned JWT And Schema

**Files:**
- Create: `/home/kuon/code/tunnel-manager/migrations/00003_add_auth_token_version.sql`
- Modify: `/home/kuon/code/tunnel-manager/internal/model/auth.go`
- Modify: `/home/kuon/code/tunnel-manager/internal/pkg/jwt/jwt.go`
- Create: `/home/kuon/code/tunnel-manager/internal/pkg/jwt/jwt_test.go`

**Interfaces:**
- Produces: `GenerateToken(secret []byte, username string, tokenVersion int64, ttl time.Duration) (string, time.Time, error)`
- Produces: `ParseToken(secret []byte, tokenString string) (username string, tokenVersion int64, err error)`
- Produces: `model.Auth.TokenVersion int64`

- [ ] **Step 1: Write failing JWT tests**

Cover round-trip subject/version, wrong secret, expired token, non-HMAC algorithm, empty subject, and version `< 1`. Build malformed claims directly with `jwtlib.NewWithClaims` so failures exercise parser, not generator.

Core success assertion:

```go
token, expiresAt, err := GenerateToken(secret, "admin", 3, time.Hour)
if err != nil { t.Fatal(err) }
username, version, err := ParseToken(secret, token)
if err != nil { t.Fatal(err) }
if username != "admin" || version != 3 { t.Fatalf("got %q/%d", username, version) }
if !expiresAt.After(time.Now()) { t.Fatal("expiry not in future") }
```

- [ ] **Step 2: Verify RED**

Run: `cd /home/kuon/code/tunnel-manager && go test ./internal/pkg/jwt`

Expected: compile failure because `GenerateToken` and `ParseToken` signatures lack `tokenVersion`.

- [ ] **Step 3: Implement minimum versioned claims**

Use private claims type:

```go
type Claims struct {
    TokenVersion int64 `json:"tokenVersion"`
    jwtlib.RegisteredClaims
}
```

Reject empty subject and `TokenVersion < 1` after `ParseWithClaims`; continue requiring HMAC signing. Add model field and migration with default `1`.

- [ ] **Step 4: Verify GREEN**

Run: `cd /home/kuon/code/tunnel-manager && go test ./internal/pkg/jwt && go test ./internal/model`

Expected: PASS.

- [ ] **Step 5: Commit task-owned files**

Run only if staging can exclude unrelated work:

```bash
git add migrations/00003_add_auth_token_version.sql internal/model/auth.go internal/pkg/jwt/jwt.go internal/pkg/jwt/jwt_test.go
git commit -m "feat: version auth tokens"
```

### Task 2: Auth Service And Password Rotation

**Files:**
- Modify: `/home/kuon/code/tunnel-manager/internal/services/auth/service.go`
- Modify: `/home/kuon/code/tunnel-manager/internal/services/auth/login.go`
- Modify: `/home/kuon/code/tunnel-manager/internal/services/auth/bootstrap.go`
- Create: `/home/kuon/code/tunnel-manager/internal/services/auth/change_password.go`
- Create: `/home/kuon/code/tunnel-manager/internal/services/auth/service_test.go`
- Create: `/home/kuon/code/tunnel-manager/internal/pkg/request/auth/change_password.go`

**Interfaces:**
- Produces: `Authenticate(ctx context.Context, token string) (username string, error)`
- Produces: `ChangePassword(ctx context.Context, username, currentPassword, newPassword string) (token string, expiresAt time.Time, err error)`
- Produces: `ErrInvalidCredentials`, `ErrInvalidPassword`, `ErrSamePassword`, `ErrUnauthorized`

- [ ] **Step 1: Write failing service tests with in-memory fake repository**

Fake must implement existing `AuthRepository` using copied `model.Auth` values, not mocks of method call counts. Cover:

```go
func TestChangePasswordRotatesTokenVersion(t *testing.T) { /* old hash/version 1; assert new hash/version 2 and returned JWT version 2 */ }
func TestChangePasswordRejectsWrongCurrentPassword(t *testing.T) {}
func TestChangePasswordRejectsPasswordByteLimits(t *testing.T) {}
func TestChangePasswordRejectsSamePassword(t *testing.T) {}
func TestAuthenticateRejectsStaleVersion(t *testing.T) {}
func TestBootstrapCreatesMissingAdminOnce(t *testing.T) {}
func TestBootstrapPreservesExistingPasswordAndVersion(t *testing.T) {}
```

Include multibyte boundary cases using `strings.Repeat("é", 6)` (12 bytes) and a value over 72 bytes.

- [ ] **Step 2: Verify RED**

Run: `cd /home/kuon/code/tunnel-manager && go test ./internal/services/auth`

Expected: compile failures for missing service methods/errors and changed JWT signature.

- [ ] **Step 3: Implement minimum service behavior**

Request DTO:

```go
type ChangePasswordRequest struct {
    CurrentPassword string `json:"currentPassword" binding:"required"`
    NewPassword     string `json:"newPassword" binding:"required"`
}
```

Validation uses `len([]byte(newPassword))`. `Authenticate` parses JWT, loads account by subject, compares token versions, and returns only generic `ErrUnauthorized`. `ChangePassword` validates before persistence, increments version once, updates hash/time, then signs replacement token. Login signs current row version. Bootstrap creates missing row at version `1` and returns unchanged when found.

- [ ] **Step 4: Verify GREEN**

Run: `cd /home/kuon/code/tunnel-manager && go test ./internal/services/auth`

Expected: PASS.

- [ ] **Step 5: Commit task-owned files**

```bash
git add internal/services/auth internal/pkg/request/auth/change_password.go
git commit -m "feat: rotate password and sessions"
```

### Task 3: Backend HTTP Authentication Boundary

**Files:**
- Modify: `/home/kuon/code/tunnel-manager/internal/pkg/middleware/auth.go`
- Create: `/home/kuon/code/tunnel-manager/internal/pkg/middleware/auth_test.go`
- Modify: `/home/kuon/code/tunnel-manager/internal/application/api/route/auth/route.go`
- Create: `/home/kuon/code/tunnel-manager/internal/application/api/route/auth/change_password.go`
- Modify: `/home/kuon/code/tunnel-manager/internal/application/api/route/domain/route.go`
- Create: `/home/kuon/code/tunnel-manager/internal/application/api/route/domain/route_test.go`
- Modify: `/home/kuon/code/tunnel-manager/README.md`

**Interfaces:**
- Consumes: `AuthService.Authenticate` and `AuthService.ChangePassword`
- Produces: `middleware.JWTAuth(authenticator Authenticator) gin.HandlerFunc`
- Produces: Gin context key `authenticatedUsername`
- Produces: authenticated `PUT /api/auth/password`

- [ ] **Step 1: Write failing middleware tests**

Use real Gin test routes plus tiny authenticator fake returning username or error. Assert:

- missing/malformed bearer gets `401`
- authenticator error gets same generic `401`
- valid token reaches handler and context username equals expected value

- [ ] **Step 2: Write failing route boundary test**

Construct `DomainRoute` with Gin engine and minimal handler/service fake, call `Setup`, then request `GET /api/domains` without bearer token. Assert `401` before domain handler runs.

- [ ] **Step 3: Verify RED**

Run: `cd /home/kuon/code/tunnel-manager && go test ./internal/pkg/middleware ./internal/application/api/route/domain ./internal/application/api/route/auth`

Expected: compile/test failure because middleware still accepts raw secret and routes do not use service-backed authentication.

- [ ] **Step 4: Implement middleware and routes**

Middleware contract:

```go
type Authenticator interface {
    Authenticate(ctx context.Context, token string) (string, error)
}

const AuthenticatedUsernameKey = "authenticatedUsername"
```

Domain route injects `authservice.AuthService` through `fx.In` and uses middleware on group. Auth route keeps login group public and password group protected. Password handler reads context username, binds DTO, maps service errors to specified statuses, and returns login-shaped replacement token response.

- [ ] **Step 5: Verify GREEN and full backend**

Run:

```bash
cd /home/kuon/code/tunnel-manager
gofmt -w internal/model/auth.go internal/pkg/jwt internal/services/auth internal/pkg/middleware internal/application/api/route/auth internal/application/api/route/domain
go test ./...
go build ./...
```

Expected: all PASS and build exit `0`.

- [ ] **Step 6: Commit task-owned hunks**

Because several backend files already contain unrelated dirty work, inspect/stage hunks carefully. Never use `git add .`.

```bash
git diff -- internal/pkg/middleware internal/application/api/route/auth internal/application/api/route/domain/route.go README.md
git add internal/pkg/middleware internal/application/api/route/auth internal/application/api/route/domain/route_test.go README.md
git add -p internal/application/api/route/domain/route.go
git commit -m "feat: protect backend routes"
```

### Task 4: Frontend Session And Backend Proxy

**Files:**
- Modify: `/home/kuon/code/tunnel-manager-fe/.env.local`
- Modify: `/home/kuon/code/tunnel-manager-fe/.env.local.example`
- Create: `/home/kuon/code/tunnel-manager-fe/lib/server/session-options.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/lib/server/session.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/lib/server/backend-core.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/lib/server/backend.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/lib/server/backend.test.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/app/api/session/login/route.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/app/api/session/route.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/app/api/session/password/route.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/app/api/backend/[...path]/route.ts`
- Modify: `/home/kuon/code/tunnel-manager-fe/package.json`

**Interfaces:**
- Produces: `SESSION_COOKIE_NAME = "tunnel-manager-session"`
- Produces: `getBackendBaseURL(): URL`
- Produces: `requireSameOrigin(request: Request): Response | undefined`
- Produces: `proxyBackend(request: Request, path: string[], authenticated: boolean): Promise<Response>`
- Produces: same-origin session and backend API routes.

- [ ] **Step 1: Add native test script and failing helper tests**

Package script:

```json
"test": "node --experimental-strip-types --test 'lib/**/*.test.ts'"
```

Tests use `node:test` and `node:assert/strict`. Import pure `backend-core.ts` and `session-options.ts`; wrappers that import `server-only` remain covered by Next.js build. Inject backend fetch and environment where needed; do not perform real network calls. Cover URL validation, origin matching, cookie attributes, bearer injection, browser authorization stripping, forwarding method/path/query/body/status/content type, and `401` cookie deletion.

- [ ] **Step 2: Verify RED**

Run: `cd /home/kuon/code/tunnel-manager-fe && pnpm test`

Expected: module-not-found for missing server helpers.

- [ ] **Step 3: Implement server-only helpers**

Start `session.ts` and `backend.ts` with `import "server-only"`. Keep `session-options.ts` and `backend-core.ts` runtime-neutral so Node native tests can import them without Next.js module aliases. Parse `process.env.API_BASE_URL` using `new URL`; require `http:` or `https:`. Build backend URL from controlled catch-all segments and original query. Copy only needed request headers. Never forward incoming `authorization`, `cookie`, `host`, or `origin`.

Cookie options:

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(expiresAt),
}
```

- [ ] **Step 4: Implement route handlers**

Use `await cookies()` from `next/headers`. Catch-all context uses Next.js 16 async params:

```ts
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/backend/[...path]">,
) {
  const { path } = await context.params;
  return proxyBackend(request, path, true);
}
```

Export same delegate for `GET`, `POST`, `PUT`, and `DELETE`. Login/password handlers consume backend token server-side, set cookie, and return `{}` with backend success status. Logout deletes cookie. Apply same-origin check to login/logout/password and proxied non-GET/HEAD requests.

- [ ] **Step 5: Verify GREEN**

Run: `cd /home/kuon/code/tunnel-manager-fe && pnpm test && pnpm lint && pnpm build`

Expected: all PASS; build lists API routes.

- [ ] **Step 6: Commit task-owned files**

`.env.local` stays ignored and uncommitted. Commit example/config/code only.

```bash
git add .env.local.example package.json lib/server app/api
git commit -m "feat: proxy authenticated backend API"
```

### Task 5: Frontend Auth Navigation And UI

**Files:**
- Create: `/home/kuon/code/tunnel-manager-fe/proxy.ts`
- Modify: `/home/kuon/code/tunnel-manager-fe/app/layout.tsx`
- Create: `/home/kuon/code/tunnel-manager-fe/app/(authenticated)/layout.tsx`
- Move: `/home/kuon/code/tunnel-manager-fe/app/page.tsx` → `/home/kuon/code/tunnel-manager-fe/app/(authenticated)/page.tsx`
- Move: `/home/kuon/code/tunnel-manager-fe/app/domains/[id]/page.tsx` → `/home/kuon/code/tunnel-manager-fe/app/(authenticated)/domains/[id]/page.tsx`
- Create: `/home/kuon/code/tunnel-manager-fe/app/login/page.tsx`
- Create: `/home/kuon/code/tunnel-manager-fe/components/login-form.tsx`
- Create: `/home/kuon/code/tunnel-manager-fe/components/change-password-dialog.tsx`
- Modify: `/home/kuon/code/tunnel-manager-fe/components/app-sidebar.tsx`
- Create: `/home/kuon/code/tunnel-manager-fe/lib/api-config.ts`
- Create: `/home/kuon/code/tunnel-manager-fe/lib/api-config.test.ts`
- Modify: `/home/kuon/code/tunnel-manager-fe/lib/api.ts`
- Modify: `/home/kuon/code/tunnel-manager-fe/README.md`

**Interfaces:**
- Consumes: Task 4 session endpoints.
- Produces: `login`, `logout`, and `changePassword` client API methods.
- Produces: protected `/` and `/domains/[id]`, public `/login`.

- [ ] **Step 1: Write failing client API self-check**

Add pure request configuration helpers in `lib/api-config.ts` and native tests in `lib/api-config.test.ts` so update origin must serialize:

```json
{"originUrl":"http://localhost:3001"}
```

and domain base path must equal `/api/backend`. Run test and observe failure against current direct backend URL and camelCase payload.

- [ ] **Step 2: Implement client API minimum**

Axios base URL becomes `/api/backend`. Add session calls with plain same-origin Axios or native fetch. Add response interceptor that redirects only in browser on `401`. Do not store token. Keep update body key as `originUrl` to match backend DTO.

- [ ] **Step 3: Move authenticated shell and pages**

Root layout retains `<html>`, fonts, `Providers`, and `Toaster`. Authenticated route-group layout owns `SidebarProvider`, `AppSidebar`, header, and content inset. Moves preserve public URLs because route groups do not affect paths.

- [ ] **Step 4: Add login and password forms**

Login validates required fields, calls session login, then `router.replace("/")` and `router.refresh()`.

Password dialog validates with:

```ts
const bytes = new TextEncoder().encode(newPassword).length;
if (bytes < 12 || bytes > 72) { /* show exact limit error */ }
if (newPassword !== confirmation) { /* show mismatch */ }
```

On success close dialog and show toast. Backend repeats all validation.

- [ ] **Step 5: Add logout and navigation proxy**

Sidebar logout calls session delete, invokes `queryClient.clear()`, then replaces route with `/login`. Add Change password action/dialog.

Root `proxy.ts` uses cookie-presence redirects and constant matcher excluding `api`, `_next/static`, `_next/image`, favicon, and public assets. It never treats cookie presence as token validity.

- [ ] **Step 6: Update env docs and verify UI build**

Document `API_BASE_URL` and BFF flow. Run:

```bash
cd /home/kuon/code/tunnel-manager-fe
pnpm test
pnpm lint
pnpm build
```

Expected: all PASS; route output includes `/login`, unchanged domain URLs, session endpoints, backend catch-all, and proxy.

- [ ] **Step 7: Commit task-owned hunks**

`lib/api.ts` was dirty before task. Inspect and stage only auth/proxy hunks; preserve unrelated edits.

```bash
git add proxy.ts app components/login-form.tsx components/change-password-dialog.tsx components/app-sidebar.tsx README.md
git add -p lib/api.ts
git commit -m "feat: add frontend auth flows"
```

### Task 6: End-To-End Contract Verification

**Files:**
- No production files expected unless verification finds defect.

**Interfaces:**
- Verifies all prior task contracts together.

- [ ] **Step 1: Run backend verification**

```bash
cd /home/kuon/code/tunnel-manager
go test ./...
go build ./...
```

Expected: PASS, exit `0`.

- [ ] **Step 2: Run frontend verification**

```bash
cd /home/kuon/code/tunnel-manager-fe
pnpm test
pnpm lint
pnpm build
```

Expected: PASS, exit `0`.

- [ ] **Step 3: Apply migration in configured local backend**

Run: `cd /home/kuon/code/tunnel-manager && make migrate`

Expected: Goose applies `00003_add_auth_token_version.sql` or reports already current.

- [ ] **Step 4: Start backend and frontend for browser/API verification**

Use existing run commands in separate persistent terminals:

```bash
cd /home/kuon/code/tunnel-manager && make run
cd /home/kuon/code/tunnel-manager-fe && pnpm dev
```

- [ ] **Step 5: Verify security and behavior manually**

Ordered checks:

1. Direct unauthenticated `GET http://localhost:8180/api/domains` returns `401`.
2. Visiting `http://localhost:3000/` without cookie redirects to `/login`.
3. Invalid login shows generic invalid-credentials error.
4. Valid login sets `HttpOnly`, `SameSite=Lax`, `Path=/` cookie and renders domains.
5. List/detail/create/update/stop/restart/logs/metrics work through `/api/backend`.
6. Capture old JWT server-side, change password, confirm UI stays logged in and old JWT gets `401` directly from backend.
7. Restart backend, confirm new password still logs in and old env password does not.
8. Logout deletes cookie, clears cached domain data, and redirects to `/login`.

- [ ] **Step 6: Review final diffs and working trees**

```bash
git -C /home/kuon/code/tunnel-manager --no-pager diff --check
git -C /home/kuon/code/tunnel-manager-fe --no-pager diff --check
git -C /home/kuon/code/tunnel-manager status --short
git -C /home/kuon/code/tunnel-manager-fe status --short
```

Expected: no whitespace errors; all remaining changes identified as task changes or preserved pre-existing user changes.
