# Tunnel Manager Frontend

Next.js frontend for Tunnel Manager backend.

## Configuration

Copy `.env.local.example` to `.env.local` and set server-only backend URL:

```env
API_BASE_URL=http://localhost:8180
```

Do not prefix this variable with `NEXT_PUBLIC_`. Browser calls same-origin
Next.js route handlers under `/api`; Next.js proxies requests to backend and
keeps backend JWT in an `HttpOnly`, `SameSite=Lax` cookie.

When the production backend hostname is protected by a Cloudflare Access
Service Auth policy, also configure these server-only variables in Vercel:

```env
CF_ACCESS_CLIENT_ID=<service-token-client-id>
CF_ACCESS_CLIENT_SECRET=<service-token-client-secret>
```

Both variables must be configured together. The route handlers ignore any
Cloudflare Access headers supplied by the browser and attach only these trusted
server-side credentials to backend requests.

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and sign in with backend admin credentials.

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

Password change requires current password and a different new password of
12–72 UTF-8 bytes. Successful change rotates JWT and invalidates older sessions.
