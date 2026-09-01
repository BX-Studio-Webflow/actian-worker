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
