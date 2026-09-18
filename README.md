# Actian trial downloads

pnpm monorepo with a Webflow/Marketo frontend package and a Cloudflare Worker backend.

```
packages/
  frontend/   # script loaded on the trial page
  server/     # gated R2 download Worker + S3 upload script
```

## How this wires to the Webflow page

The page is OS tabs (Windows / Mac / Linux) with four CTAs each. Those CTAs currently point at `edownloads.tibco.com`. Do **not** restyle the page. Add one script tag in page custom code:

```html
<script
	type="module"
	src="http://localhost:3000/pages/download/index.js"
	data-api="https://actian-trial-downloads.<account>.workers.dev"
></script>
```

In production, point `src` at the deployed frontend asset.

The production frontend asset is delivered via jsDelivr. OneTrust must not auto-block jsDelivr or the Worker origin supplied in `data-api`; both are required to issue and serve gated downloads.

What the script does:

1. Marketo `onSuccess` stores the business email (lead is already in Marketo).
2. Clicks on `.item-trial_download a.cta-main` are intercepted (`preventDefault` so TIBCO is never hit).
3. The installer is identified from `data-download-file` if present, otherwise from the TIBCO filename in the existing `href`.
4. `POST /api/link` runs country / IP / email gating and returns a 10-minute signed Worker URL.
5. The browser navigates to that URL; the Worker streams the private R2 object.

Optional per-button override (only if an href filename is wrong — Mac Studio/Web Studio currently share bad TIBCO URLs):

```html
<a class="cta-main w-inline-block" data-download-file="jss-macos" href="#">
```

### File aliases (10.0.0)

| Tab | Product | Alias | R2 key |
| --- | --- | --- | --- |
| Windows | JasperReports Server | `jrs-windows` | `10.0.0/js-jrs_10.0.0_win_x86_64.exe` |
| Windows | Jaspersoft Studio | `jss-windows` | `10.0.0/js-jss_10.0.0_windows_x86_64.exe` |
| Windows | Web Studio | `jrws-windows` | `10.0.0/js-jrws-pro_10.0.0_windows_x86_64.zip` |
| Windows | IO Professional | `jrio-windows` | `10.0.0/js-jrio-pro_10.0.0_windows_x86_64.zip` |
| Mac | Server | `jrs-macos` | `10.0.0/js-jrs_10.0.0_macosx_x86_64.zip` |
| Mac | Studio | `jss-macos` | `10.0.0/js-jss_10.0.0_macosx_x86_64.zip` |
| Mac | Web Studio | `jrws-macos` | `10.0.0/js-jrws-pro_10.0.0_mac_x86_64.zip` |
| Mac | IO Professional | `jrio-macos` | `10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip` |
| Linux | Server | `jrs-linux` | `10.0.0/js-jrs_10.0.0_linux_x86_64.run` |
| Linux | Studio | `jss-linux` | `10.0.0/js-jss_10.0.0_linux_x86_64.tgz` |
| Linux | Web Studio | `jrws-linux` | `10.0.0/js-jrws-pro_10.0.0_linux_x86_64.zip` |
| Linux | IO Professional | `jrio-linux` | `10.0.0/js-jrio-pro_10.0.0_linux_x86_64.zip` |

Catalog lives in `packages/server/src/catalog.ts`. TIBCO filenames from the current hrefs are also registered so the existing markup works.

**On disk today** (Chris extract) only these installers exist. The rest 404 until uploaded:

- `10.0.0/js-jrs_10.0.0_linux_x86_64.run`
- `10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip`
- `9.0.0/JasperReports-Server_9.0.0_win_x86_64.exe`
- `9.0.0/JasperReports-Server_9.0.0_linux_x86_64.run`
- `9.0.0/JasperReports-IO_4.0.0_macosx_x86_64.zip`

## Upload to R2 (S3-compatible API)

1. In the Actian Cloudflare account, create the bucket `actian-trial-downloads` (private, no public access).
2. [Create an R2 API token](https://developers.cloudflare.com/r2/api/tokens/) with Object Read & Write on that bucket.
3. Put credentials in `packages/server/.dev.vars` (see `.dev.vars.example`):

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=actian-trial-downloads
TOKEN_SECRET=...
```

4. Preview then upload (multipart, required for 300MB–1GB files):

```bash
pnpm upload:dry
pnpm upload
pnpm upload -- --skip-existing
```

The script walks `packages/server/downloads/`, skips the Google Drive wrapper zips, and PUTs mapped installers to `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## Worker gating (confirmed 8/25)

| Rule | Launch behavior |
| --- | --- |
| Business email | Block free/personal domains from the client list |
| Country | Block `ru`, `sy`, `ir`, `kp`, `by`, `cu`, `cn`, `mm`, `ua`, `ve` |
| IP | Capability present; no IPs blocked at launch |

Marketo still captures the lead before the download is allowed or refused.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Frontend (port 3000) and Worker |
| `pnpm upload:dry` / `pnpm upload` | List / upload installers to R2 |
| `pnpm test` | Worker tests |
| `pnpm deploy:server` | Deploy the Worker |
| `pnpm deploy:frontend` | Deploy the page script |

## Technical solution details

### Architecture

The solution replaces direct trial-download links with a gated, short-lived download flow. Installers live in a private Cloudflare R2 bucket and can only be downloaded through a Cloudflare Worker.

The frontend module is TypeScript compiled with esbuild and deployed as a static JavaScript asset. The production asset is delivered through jsDelivr and loaded by the Webflow trial page. The Cloudflare Worker issues and validates signed download URLs, applies access gates, and streams installer files from its private R2 binding. Marketo remains the form and lead-capture system; its webhook endpoint is separate from download authorization.

### Browser request flow

1. Webflow loads the production module from jsDelivr. The script tag's `data-api` attribute provides the Worker origin; `ACTIAN_API_ORIGIN` is a build-time fallback.
2. When Marketo's `MktoForms2` API signals a successful form submission, the module stores the submitted email in `sessionStorage` under `actian-trial-email`.
3. A visitor clicks a CTA matching `.item-trial_download a.cta-main`.
4. The module prevents the CTA's default navigation. It obtains the installer from `data-download-file`, or derives the filename from the existing CTA URL. Existing TIBCO URLs can remain in Webflow markup without being visited.
5. The module reads the email from session storage, falling back to the page's email input. If no email is available, it scrolls to the form instead of requesting a download.
6. The module sends `POST <Worker origin>/api/link` with `{ "email": "...", "file": "..." }`.
7. If successful, it navigates to the returned signed URL. The Worker validates that URL and streams the R2 object as an attachment.

The browser never calls R2 directly. It makes the API request and then navigates to the Worker download endpoint.

### Webflow requirements

Use a module script tag equivalent to the following. In production, `src` is the built jsDelivr asset and `data-api` is the deployed Worker hostname or custom domain.

```html
<script
	type="module"
	src="https://cdn.jsdelivr.net/.../pages/download/index.js"
	data-api="https://downloads.example.com"
></script>
```

Each download CTA must have `cta-main` inside an `.item-trial_download` element. Existing TIBCO `href` values work because their basenames are registered in the file catalog. Add `data-download-file="<alias>"` only when the existing URL identifies an incorrect installer.

### Worker API

| Route | Method | Purpose |
| --- | --- | --- |
| `/health` | `GET` | Returns `{ "ok": true, "status": "ok" }` for a health check. |
| `/api/link` | `POST` | Validates the file and requester, then returns a signed download URL. |
| `/download` | `GET`, `HEAD` | Validates the token and streams the private R2 object. |
| `/webhook/marketo` | `POST` | Receives Marketo lead payloads for attribution. Server-to-server only. |

`/api/link` rejects malformed JSON bodies larger than 8 KiB, invalid email addresses, blocked emails/countries/IPs, and unknown files. It first verifies the R2 object exists, then returns a URL with `f` (R2 key), `e` (Unix expiry), `n` (random UUID nonce), and `s` (hexadecimal HMAC signature). The URL lifetime defaults to 600 seconds and is configurable with `LINK_TTL_SECONDS`.

`/download` requires a valid, unexpired signature. It passes `Range` and conditional request headers to R2, supports partial content responses, and returns `Cache-Control: private, no-store`, `Accept-Ranges: bytes`, `X-Content-Type-Options: nosniff`, attachment `Content-Disposition`, and R2 content metadata.

### Security and gating

Files resolve only through the built-in catalog plus optional `ALLOWED_FILES` overrides. Both aliases and explicit catalog keys are supported. Object keys reject traversal, backslashes, null bytes, invalid characters, leading slashes, and keys longer than 512 characters.

The Worker applies country and IP checks on both `/api/link` and `/download`. Country comes from Cloudflare request country data, with `CF-IPCountry` as a fallback. IP comes from `CF-Connecting-IP`, with `X-Forwarded-For` as a fallback. Default blocked countries are `ru`, `sy`, `ir`, `kp`, `by`, `cu`, `cn`, `mm`, `ua`, and `ve`; extra countries and IPs are configurable through comma-separated environment variables.

Email is validated and gated on `/api/link`. The default policy rejects consumer/free-mail domains; `EXTRA_BLOCKED_EMAIL_LABELS` can extend that list.

The Worker signs the object key, expiry, and nonce using HMAC-SHA-256, then verifies signatures using a timing-safe comparison. `TOKEN_SECRET` is required to issue and validate download links; a missing secret fails closed with a configuration error.

`/webhook/marketo` is not a download gate. It requires `MARKETO_WEBHOOK_SECRET` in `X-Webhook-Secret` or a `secret` query parameter, then logs valid lead payloads for attribution. Prefer the header so the secret is not placed in URLs or logs.

### CORS and OneTrust

The Worker handles `OPTIONS` and permits `GET`, `HEAD`, `POST`, and `OPTIONS` with `Content-Type` and `Accept`. `CORS_ORIGINS` is currently `*`; restrict it in production to the Webflow and Actian origins that host the trial page. The Worker also recognizes `actian.com` and subdomains plus `webflow.io` subdomains.

For OneTrust, exempt from automatic blocking or categorize as Strictly Necessary, subject to legal review:

- `cdn.jsdelivr.net`, which delivers the download-interceptor module.
- The configured Cloudflare Worker hostname or custom domain, which receives `POST /api/link` and serves signed `/download` URLs.

Cloudflare R2 is server-side only, so it does not need a browser-side OneTrust exception. The R2 upload script and AWS SDK are operator tooling, not visitor-side dependencies.

Marketo is the form/lead-capture provider. The module uses it to retain the email after form success, but its OneTrust category must follow the applicable privacy policy; this code does not establish it as Strictly Necessary. The module can fall back to the visible email field when Marketo's JavaScript API is unavailable.

If jsDelivr is blocked, the click interceptor does not load and CTAs navigate to their original TIBCO `href` values. If the Worker domain is blocked, the interceptor loads but cannot issue a signed link. Test both rejected-consent and accepted-consent states in an incognito browser.

### Configuration, deployment, and release validation

Worker bindings and non-secret configuration live in `packages/server/wrangler.jsonc`. Store `TOKEN_SECRET` and `MARKETO_WEBHOOK_SECRET` as Cloudflare secrets with `wrangler secret put` for every deployed environment. Keep `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` only in `packages/server/.dev.vars`; do not commit them. Use different values per environment and rotate any secret exposed in chat, source control, an issue, or logs.

`pnpm deploy:frontend` publishes the compiled static asset to Cloudflare Pages; jsDelivr can then deliver that production asset. `pnpm deploy:server` deploys the production Worker. `pnpm upload` transfers mapped installers to the private bucket through R2's S3-compatible endpoint and is not part of the visitor request flow.

Before release, confirm the Webflow script loads from jsDelivr, the `data-api` Worker origin is correct and OneTrust-permitted, an eligible form submission returns a signed link, the Worker streams the file, and blocked email/country/IP cases are refused.
