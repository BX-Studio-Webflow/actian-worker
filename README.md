# Actian trial download Worker

Cloudflare Worker that hosts Actian trial files in a private R2 bucket and issues short-lived, signed download links after a cleared form submission.

The previous Webflow image-optimization / cache-warming Worker has been removed. This service does not intercept site HTML.

## Access flow

1. The Marketo form still submits first, so the lead is captured even when a download is refused.
2. After a successful Marketo submit, the page calls `POST /api/link` with `{ email, file }`.
3. The Worker checks country, IP (empty list at launch), and business-email domain.
4. Cleared requests receive an HMAC-signed URL that expires in 10 minutes by default.
5. `GET /download` validates the token again (fail closed), re-checks country/IP, then streams the object from R2.

Direct object URLs are not public. Expired or tampered tokens return `401`.

Downloads go through the Worker on purpose so country and IP rules still apply on the file request itself. S3-style R2 presigned URLs would skip that gate after the redirect.

## Gating (confirmed 8/25)

| Rule | Launch behavior |
| --- | --- |
| Business email | Block free/personal domains from the client list |
| Country | Block `ru`, `sy`, `ir`, `kp`, `by`, `cu`, `cn`, `mm`, `ua`, `ve` |
| IP | Capability present; no IPs blocked at launch (`BLOCKED_IPS` is empty) |

Email labels: `gmail`, `aol`, `yahoo`, `ymail`, `proton`, `zoho`, `fastmail`, `titan`, `test`, `hotmail`, `icloud`, `live`, `outlook`, `mailinator`, `guest-post-services`, `domain`, `company`, `mac`, `me`, `gmas`, `ao`, `ha`.

## Endpoints

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/link` | POST | Issue a signed download URL after gating |
| `/download` | GET, HEAD | Stream the R2 object when the token is valid |
| `/embed.js` | GET | Optional Marketo `onSuccess` helper |
| `/health` | GET | Liveness |

`POST /api/link` body:

```json
{ "email": "name@acme.com", "file": "vector-windows" }
```

Success:

```json
{
	"ok": true,
	"url": "https://<worker>/download?f=...&e=...&n=...&s=...",
	"expiresAt": 1770000000,
	"file": "trials/vector-windows.exe"
}
```

Blocked or invalid requests return JSON `{ ok: false, error, message }` with `400` / `401` / `403` / `404`.

## Wire a Webflow / Marketo page

Do not change staging pages beyond the download hook. After the Marketo form succeeds:

```javascript
MktoForms2.whenReady(function (form) {
	form.onSuccess(function (values) {
		fetch('https://<worker-host>/api/link', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: values.Email,
				file: 'vector-windows',
			}),
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (body) {
				if (body.url) window.location.assign(body.url);
			});
		return true;
	});
});
```

Or add one script tag (set `data-file` or `data-download-file` on the form):

```html
<script src="https://<worker-host>/embed.js" data-file="vector-windows"></script>
```

## Setup

1. Create the R2 buckets in the Actian Cloudflare account:
   - `actian-trial-downloads` (production)
   - `actian-trial-downloads-dev` (optional)
2. Upload trial binaries as private objects. Final inventory is still pending from Chris (~12 files, 300MB–1GB).
3. Set `ALLOWED_FILES` to a JSON map of form aliases to object keys once names are confirmed:

```json
{
	"vector-windows": "trials/actian-vector-windows.exe"
}
```

Leave it as `{}` to accept any existing object key.

4. Set the signing secret (do not put this in `wrangler.jsonc`):

```bash
pnpm wrangler secret put TOKEN_SECRET --env production
pnpm wrangler secret put TOKEN_SECRET --env development
```

5. Deploy:

```bash
pnpm install
pnpm test
pnpm run deploy
```

Local development uses `.dev.vars` (see `.dev.vars.example`).

## Environment variables

| Name | Secret | Default | Purpose |
| --- | --- | --- | --- |
| `TOKEN_SECRET` | yes | — | HMAC key for download links |
| `ALLOWED_FILES` | no | `{}` | JSON alias → R2 object key |
| `LINK_TTL_SECONDS` | no | `600` | Signed link lifetime |
| `CORS_ORIGINS` | no | `*` | Allowed browser origins |
| `BLOCKED_IPS` | no | empty | Comma-separated IPs |
| `EXTRA_BLOCKED_COUNTRIES` | no | empty | Extra ISO country codes |
| `EXTRA_BLOCKED_EMAIL_LABELS` | no | empty | Extra email domain labels |

## Commands

| Command | Description |
| --- | --- |
| `pnpm run dev` | Local Worker |
| `pnpm test` | Vitest (Workers pool) |
| `pnpm run lint` / `pnpm run lint:fix` | ESLint + Prettier |
| `pnpm run check` | `tsc --noEmit` |
| `pnpm run deploy` | Deploy production |
| `pnpm run cf-typegen` | Regenerate `worker-configuration.d.ts` |
