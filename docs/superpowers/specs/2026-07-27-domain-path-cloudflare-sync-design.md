# Domain Path and Cloudflare Sync FE Design

## Goal

Update FE for backend domain path and Cloudflare sync support. Managed domains keep existing controls. Synced domains remain visible but read-only.

## API Model

Extend `Domain` with backend fields:

- `path: string`
- `managed: boolean`
- `cloudflareStatus: string`

Extend create-domain input with `path: string`. Empty path remains valid and means all paths for hostname.

## Create Domain

Add optional `Path` input below origin URL in `CreateDomainDialog`.

- Placeholder: `/api/.*`
- Help text: leaving it empty routes every path for hostname.
- Submit `{ hostname, originUrl, path }` unchanged.
- Reset path after successful creation.
- Keep native required validation for hostname and origin URL; path stays optional.

## Domain List

Add source and path visibility without adding interactions:

- Show `Path`, using `All paths` when empty.
- Show `Managed` for locally managed domains and `Cloudflare sync` for synced domains.
- For synced domains, render unavailable process fields (`metricsPort`, `pid`, `restartCount`) as `—` instead of zero values.
- Keep row navigation to domain details for both sources.

## Domain Detail

Configuration card shows origin URL, path, source, and Cloudflare status alongside existing process fields.

Managed domain behavior stays unchanged: edit origin, delete, stop, restart, logs, and metrics remain available.

For `managed: false`:

- Hide Edit, Delete, Stop, and Restart controls.
- Hide Logs and Metrics tabs.
- Render process-only values as `—`.
- Show read-only notice explaining domain is synced from Cloudflare and must be managed there.

This prevents unsupported requests while backend remains final authorization boundary and returns `409` if called directly.

## Error Handling

Existing query and mutation errors remain unchanged. New fields need no fallback because updated backend contract always returns them. Empty path receives explicit `All paths` display.

## Testing

Add small API payload self-check covering `path` serialization. Verify FE with:

1. Unit tests.
2. ESLint.
3. Production build.

Manual behavior target:

- Create dialog submits optional path and resets it after success.
- Managed domains retain all controls.
- Synced domains expose no mutation or process controls.
- Synced detail page exposes no logs or metrics requests through mounted panels.
