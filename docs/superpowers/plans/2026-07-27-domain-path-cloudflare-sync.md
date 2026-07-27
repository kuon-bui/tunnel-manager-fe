# Domain Path and Cloudflare Sync FE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Cloudflare ingress path creation and render Cloudflare-synced domains as read-only FE records without process controls.

**Architecture:** Keep backend API as source of truth. Add typed request/response fields in existing API module, keep tested presentation policy in one small pure helper, then let existing list/detail components conditionally render from that policy. No new dependency or route.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5, Axios, TanStack Query, Tailwind CSS 4, shadcn/Base UI, Node native test runner.

## Global Constraints

- `path` stays optional; empty string means every path for hostname.
- `managed: false` domains expose no Edit, Delete, Stop, Restart, Logs, or Metrics UI.
- Synced-domain process values render as `—`, not backend zero values.
- Backend remains authorization boundary; FE only prevents unsupported requests.
- Keep existing Client Component boundaries; `CreateDomainDialog` and `DomainDetail` already require client state/hooks.
- Use installed dependencies only.
- Use TDD: run each new pure behavior test red before production edit, then green after minimum edit.

---

## File Map

- `lib/api-config.test.ts`: request payload contract checks.
- `lib/api-config.ts`: typed create-domain payload builder.
- `lib/api.ts`: backend `Domain` response and create input types.
- `components/create-domain-dialog.tsx`: optional path state/input/submission/reset.
- `lib/domain-view.test.ts`: managed/synced presentation-policy checks.
- `lib/domain-view.ts`: shared path/source/capability presentation policy.
- `components/domains-table.tsx`: path/source columns and synced process fallbacks.
- `components/domain-detail.tsx`: synced read-only notice, configuration, and control/tab gating.

---

### Task 1: Optional Create-Domain Path

**Files:**
- Modify: `lib/api-config.test.ts`
- Modify: `lib/api-config.ts`
- Modify: `lib/api.ts`
- Modify: `components/create-domain-dialog.tsx`

**Interfaces:**
- Produces: `CreateDomainInput { hostname: string; originUrl: string; path: string }`
- Produces: `createDomainPayload(hostname: string, originUrl: string, path: string): CreateDomainInput`
- Updates: `createDomain(input: CreateDomainInput): Promise<Domain>`

- [ ] **Step 1: Write failing payload test**

Fix existing test indentation while adding named imports and this assertion:

```ts
import {
  DOMAIN_API_BASE_URL,
  DOMAINS_PATH,
  createDomainPayload,
  updateOriginPayload,
} from "./api-config.ts";

test("create domain uses backend path contract", () => {
  assert.deepEqual(
    createDomainPayload("app.example.com", "http://localhost:3001", "/api/.*"),
    {
      hostname: "app.example.com",
      originUrl: "http://localhost:3001",
      path: "/api/.*",
    },
  );
});
```

Keep existing base URL and update-origin assertions.

- [ ] **Step 2: Run test and verify RED**

Run: `cd /home/kuon/code/tunnel-manager-fe && pnpm test`

Expected: FAIL because `api-config.ts` does not export `createDomainPayload`.

- [ ] **Step 3: Add minimum typed payload builder**

Add to `lib/api-config.ts`:

```ts
export interface CreateDomainInput {
  hostname: string;
  originUrl: string;
  path: string;
}

export function createDomainPayload(
  hostname: string,
  originUrl: string,
  path: string,
): CreateDomainInput {
  return { hostname, originUrl, path };
}
```

Update `lib/api.ts` import and signature:

```ts
import {
  DOMAIN_API_BASE_URL,
  DOMAINS_PATH,
  type CreateDomainInput,
  updateOriginPayload,
} from "@/lib/api-config";

export function createDomain(input: CreateDomainInput): Promise<Domain> {
  return unwrap(client.post<Domain>(DOMAINS_PATH, input));
}
```

- [ ] **Step 4: Add optional Path field to dialog**

Import `createDomainPayload`, add `path` state, and use typed payload:

```tsx
const [path, setPath] = useState("");

createDomain.mutate(
  createDomainPayload(hostname, originUrl, path),
  {
    onSuccess: () => {
      toast.success(`Domain "${hostname}" created`);
      setOpen(false);
      setHostname("");
      setOriginUrl("");
      setPath("");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to create domain");
    },
  },
);
```

Add below origin URL. Native input handles text entry; description connects through `aria-describedby`:

```tsx
<div className="grid gap-2">
  <Label htmlFor="path">Path (optional)</Label>
  <Input
    id="path"
    aria-describedby="path-description"
    placeholder="/api/.*"
    value={path}
    onChange={(e) => setPath(e.target.value)}
  />
  <p id="path-description" className="text-xs text-muted-foreground">
    Leave empty to route every path for this hostname.
  </p>
</div>
```

- [ ] **Step 5: Verify GREEN**

Run: `cd /home/kuon/code/tunnel-manager-fe && pnpm test && pnpm lint && pnpm build`

Expected: tests pass, ESLint exits `0`, production build exits `0`.

- [ ] **Step 6: Commit task files**

```bash
git add lib/api-config.test.ts lib/api-config.ts lib/api.ts components/create-domain-dialog.tsx
git commit -m "feat: add domain ingress path"
```

---

### Task 2: Synced Domain Read-Only UI

**Files:**
- Modify: `lib/api.ts`
- Create: `lib/domain-view.test.ts`
- Create: `lib/domain-view.ts`
- Modify: `components/domains-table.tsx`
- Modify: `components/domain-detail.tsx`

**Interfaces:**
- Updates: `Domain` with `path: string`, `managed: boolean`, and `cloudflareStatus: string`
- Produces: `domainView(domain: Pick<Domain, "managed" | "path">)` returning `{ source, path, canManage, hasProcess }`
- Consumes: backend `managed: false` read-only contract and zero process values.

- [ ] **Step 1: Write failing presentation-policy tests**

Create `lib/domain-view.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { domainView } from "./domain-view.ts";

test("managed domain exposes controls and all-path label", () => {
  assert.deepEqual(domainView({ managed: true, path: "" }), {
    source: "Managed",
    path: "All paths",
    canManage: true,
    hasProcess: true,
  });
});

test("Cloudflare-synced domain is read-only and keeps configured path", () => {
  assert.deepEqual(domainView({ managed: false, path: "/api/.*" }), {
    source: "Cloudflare sync",
    path: "/api/.*",
    canManage: false,
    hasProcess: false,
  });
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `cd /home/kuon/code/tunnel-manager-fe && pnpm test`

Expected: FAIL with missing `lib/domain-view.ts`.

- [ ] **Step 3: Add response fields and minimum presentation helper**

Add to `Domain` in `lib/api.ts`:

```ts
path: string;
managed: boolean;
cloudflareStatus: string;
```

Create `lib/domain-view.ts`:

```ts
import type { Domain } from "@/lib/api";

export function domainView(domain: Pick<Domain, "managed" | "path">) {
  return {
    source: domain.managed ? "Managed" : "Cloudflare sync",
    path: domain.path || "All paths",
    canManage: domain.managed,
    hasProcess: domain.managed,
  };
}
```

- [ ] **Step 4: Run policy tests and verify GREEN**

Run: `cd /home/kuon/code/tunnel-manager-fe && pnpm test`

Expected: all native tests pass.

- [ ] **Step 5: Render source, path, and process availability in domain table**

Import `Badge` and `domainView`. Add `Path` and `Source` headers after Origin. Inside map callback, derive view before returning row:

```tsx
{domains.map((domain) => {
  const view = domainView(domain);
  return (
    <TableRow key={domain.id}>
      <TableCell className="font-medium">{domain.hostname}</TableCell>
      <TableCell className="text-muted-foreground">{domain.originUrl}</TableCell>
      <TableCell className="text-muted-foreground">{view.path}</TableCell>
      <TableCell>
        <Badge variant={domain.managed ? "secondary" : "outline"}>{view.source}</Badge>
      </TableCell>
      <TableCell><StatusBadge status={domain.status} /></TableCell>
      <TableCell>{view.hasProcess ? domain.metricsPort : "—"}</TableCell>
      <TableCell>{view.hasProcess && domain.pid ? domain.pid : "—"}</TableCell>
      <TableCell>{view.hasProcess ? domain.restartCount : "—"}</TableCell>
      {/* keep existing Last error and navigation cells */}
    </TableRow>
  );
})}
```

Use explicit existing Last error and navigation JSX instead of leaving comment in final source.

- [ ] **Step 6: Gate synced-domain controls and process panels**

In `DomainDetail`, derive `const view = domainView(domain)` after pending/error returns.

Render header controls only for managed domains:

```tsx
{view.canManage && (
  <div className="flex items-center gap-2">
    {/* existing Stop, Restart, and Delete controls unchanged */}
  </div>
)}
```

Use explicit existing controls instead of leaving comment in final source. Gate `EditOriginDialog` with `view.canManage`.

For synced domains, add notice using existing Alert components and `Info` icon:

```tsx
{!view.canManage && (
  <Alert>
    <Info />
    <AlertTitle>Cloudflare-managed domain</AlertTitle>
    <AlertDescription>
      This domain is synced and read-only. Manage it in Cloudflare.
    </AlertDescription>
  </Alert>
)}
```

Add configuration values:

```tsx
<div>
  <p className="text-muted-foreground">Path</p>
  <p className="font-medium">{view.path}</p>
</div>
<div>
  <p className="text-muted-foreground">Source</p>
  <p className="font-medium">{view.source}</p>
</div>
<div>
  <p className="text-muted-foreground">Cloudflare status</p>
  <p className="font-medium">{domain.cloudflareStatus || "—"}</p>
</div>
```

Render process fields with contract-aware fallbacks:

```tsx
{view.hasProcess ? domain.metricsPort : "—"}
{view.hasProcess && domain.pid ? domain.pid : "—"}
{view.hasProcess ? domain.restartCount : "—"}
```

Mount tabs only when process exists, preventing synced-domain log/metrics queries:

```tsx
{view.hasProcess && (
  <Tabs defaultValue="logs">
    {/* existing Logs and Metrics tab markup unchanged */}
  </Tabs>
)}
```

Use explicit existing tab markup instead of leaving comment in final source.

- [ ] **Step 7: Verify full FE**

Run: `cd /home/kuon/code/tunnel-manager-fe && pnpm test && pnpm lint && pnpm build`

Expected: all tests pass; ESLint and production build exit `0`; no new warning or error.

- [ ] **Step 8: Review final diff against contract**

Run: `cd /home/kuon/code/tunnel-manager-fe && git diff --check && git diff -- lib/api.ts lib/domain-view.ts lib/domain-view.test.ts components/domains-table.tsx components/domain-detail.tsx`

Verify:

1. `managed: false` mounts no mutation buttons.
2. `managed: false` mounts no `LogsPanel` or `MetricsPanel`.
3. Empty path displays `All paths`.
4. Synced process values display `—`.
5. Managed controls and process tabs remain unchanged.

- [ ] **Step 9: Commit task files**

```bash
git add lib/api.ts lib/domain-view.ts lib/domain-view.test.ts components/domains-table.tsx components/domain-detail.tsx
git commit -m "feat: show synced domains read-only"
```
