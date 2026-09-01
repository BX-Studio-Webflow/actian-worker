# Actian trial downloads

pnpm monorepo with a Webflow/Marketo frontend package and a Cloudflare Worker backend, same layout as assembled-brands.

```
packages/
  frontend/   # esbuild client loaded on the trial form page
  server/     # gated R2 download Worker
```

## Access flow

1. The Marketo form still submits first, so the lead is captured even when a download is refused.
2. The frontend script calls `POST /api/link` with `{ email, file }`.
3. The Worker checks country, IP (empty list at launch), and business-email domain.
4. Cleared requests receive an HMAC-signed URL that expires in 10 minutes by default.
5. `GET /download` validates the token again (fail closed), re-checks country/IP, then streams the object from R2.

Direct object URLs are not public. Expired or tampered tokens return `401`.

## Gating (confirmed 8/25)

| Rule | Launch behavior |
| --- | --- |
| Business email | Block free/personal domains from the client list |
| Country | Block `ru`, `sy`, `ir`, `kp`, `by`, `cu`, `cn`, `mm`, `ua`, `ve` |
| IP | Capability present; no IPs blocked at launch (`BLOCKED_IPS` is empty) |

## Packages

### `packages/server`

Cloudflare Worker bound to a private R2 bucket.

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/link` | POST | Issue a signed download URL after gating |
| `/download` | GET, HEAD | Stream the R2 object when the token is valid |
| `/health` | GET | Liveness |

### `packages/frontend`

esbuild bundle for the Webflow page. Add one script after the Marketo form (do not change the rest of the staging page):

```html
<script
	type="module"
	src="https://<frontend-assets>/pages/download/index.js"
	data-api="https://<worker-host>"
	data-file="vector-windows"
></script>
```

Or set `data-download-file` on the Marketo form element. Locally the bundle is served at `http://localhost:3000`. Set `ACTIAN_API_ORIGIN` when building if you do not want to pass `data-api`.

## Setup

```bash
pnpm install
```

1. Create R2 buckets in the Actian Cloudflare account: `actian-trial-downloads` and optionally `actian-trial-downloads-dev`.
2. Upload trial binaries (inventory still pending from Chris).
3. Copy `packages/server/.dev.vars.example` to `packages/server/.dev.vars` and set `TOKEN_SECRET`.
4. Production secret: `pnpm --filter @actian/server wrangler secret put TOKEN_SECRET --env production`

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Frontend (port 3000) and Worker together |
| `pnpm dev:frontend` / `pnpm dev:server` | One package |
| `pnpm build` | Build both packages |
| `pnpm test` | Worker Vitest suite |
| `pnpm lint` / `pnpm check` | All packages |
| `pnpm deploy:server` | Deploy the Worker |
| `pnpm deploy:frontend` | Build and deploy frontend assets to Pages |
