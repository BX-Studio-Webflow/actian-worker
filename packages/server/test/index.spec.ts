import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import worker from '../src/index';
import migration from '../src/schema/migrations/0000_icy_chat.sql?raw';
import { FILE_CATALOG } from '../src/utils/catalog';
import { mergedAllowlist, resolveObjectKey } from '../src/utils/files';
import { isBlockedCountry, isBlockedEmailDomain, isBlockedIp, normalizeEmail } from '../src/utils/gate';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const FILE_KEY = 'trials/sample.bin';
const FILE_BODY = 'trial-file-bytes';

async function putSampleFile(): Promise<void> {
	await env.DOWNLOADS.put(FILE_KEY, FILE_BODY, {
		httpMetadata: { contentType: 'application/octet-stream' },
	});
}

function jsonRequest(path: string, body: unknown, init: RequestInit<IncomingRequestCfProperties> = {}): Request {
	const { headers: initHeaders, cf, ...rest } = init;
	const headers = new Headers(initHeaders);
	headers.set('content-type', 'application/json');

	return new IncomingRequest(`https://downloads.example.com${path}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
		cf: { country: 'US', ...(cf ?? {}) },
		...rest,
	});
}

async function fetchWorker(request: Request): Promise<Response> {
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

beforeAll(async () => {
	for (const statement of migration.split('--> statement-breakpoint')) {
		const sql = statement.trim().replace(/;$/, '');
		if (sql) {
			await env.DB.prepare(sql).run();
		}
	}
});

beforeEach(async () => {
	await env.DB.exec('DELETE FROM download_grants; DELETE FROM marketo_webhook_events; DELETE FROM trial_leads;');
});

describe('file catalog', () => {
	it('maps Webflow TIBCO filenames and short aliases to R2 keys', () => {
		const allowlist = mergedAllowlist();
		expect(resolveObjectKey('jrs-linux', allowlist)).toBe('10.0.0/js-jrs_10.0.0_linux_x86_64.run');
		expect(resolveObjectKey('js-jrs-dev_10.0.0_win_x86_64.exe', allowlist)).toBe('10.0.0/js-jrs_10.0.0_win_x86_64.exe');
		expect(resolveObjectKey('js-jrio-pro_10.0.0_macos_x86_64.zip', allowlist)).toBe('10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip');
		expect(FILE_CATALOG['jss-windows']).toBe('10.0.0/js-jss_10.0.0_windows_x86_64.exe');
	});
});

describe('email domain gating', () => {
	it('blocks consumer and free-mail labels from the client list', () => {
		expect(isBlockedEmailDomain('user@gmail.com')).toBe(true);
		expect(isBlockedEmailDomain('user@yahoo.co.uk')).toBe(true);
		expect(isBlockedEmailDomain('user@protonmail.com')).toBe(true);
		expect(isBlockedEmailDomain('user@proton.me')).toBe(true);
		expect(isBlockedEmailDomain('user@outlook.com')).toBe(true);
		expect(isBlockedEmailDomain('user@me.com')).toBe(true);
		expect(isBlockedEmailDomain('user@test.io')).toBe(true);
	});

	it('allows business domains', () => {
		expect(isBlockedEmailDomain('name@acme.com')).toBe(false);
		expect(isBlockedEmailDomain('name@actian.com')).toBe(false);
		expect(normalizeEmail('Name@Acme.COM')).toBe('name@acme.com');
	});

	it('does not treat harvard.edu as the short "ha" label', () => {
		expect(isBlockedEmailDomain('dean@harvard.edu')).toBe(false);
	});
});

describe('country and IP gating', () => {
	it('blocks the confirmed ISO country codes', () => {
		expect(isBlockedCountry('cn')).toBe(true);
		expect(isBlockedCountry('RU')).toBe(true);
		expect(isBlockedCountry('us')).toBe(false);
		expect(isBlockedCountry('')).toBe(false);
	});

	it('has no blocked IPs at launch', () => {
		expect(isBlockedIp('1.2.3.4', [])).toBe(false);
		expect(isBlockedIp('1.2.3.4', ['1.2.3.4'])).toBe(true);
	});
});

describe('download Worker', () => {
	it('persists a canonical opaque grant after a cleared business-email submission', async () => {
		await putSampleFile();

		const response = await fetchWorker(
			jsonRequest('/api/link', {
				email: 'name@acme.com',
				file: FILE_KEY,
			}),
		);
		const body = (await response.json()) as { ok: boolean; url: string; file: string };

		expect(response.status).toBe(200);
		expect(body.ok).toBe(true);
		expect(body.file).toBe(FILE_KEY);
		expect(body.url).toMatch(/\/download\/[A-Za-z0-9_-]{40,}$/);

		const grant = await env.DB.prepare('SELECT requested_file, r2_object_key, status FROM download_grants').first<{
			requested_file: string;
			r2_object_key: string;
			status: string;
		}>();
		expect(grant).toEqual({ requested_file: FILE_KEY, r2_object_key: FILE_KEY, status: 'active' });
	});

	it('captures the lead path by refusing consumer email downloads without throwing', async () => {
		await putSampleFile();

		const response = await fetchWorker(
			jsonRequest('/api/link', {
				email: 'person@gmail.com',
				file: FILE_KEY,
			}),
		);
		const body = (await response.json()) as { ok: boolean; error: string };

		expect(response.status).toBe(403);
		expect(body.error).toBe('email_blocked');
	});

	it('accepts Marketo form-encoded attribution callbacks', async () => {
		const response = await fetchWorker(
			new IncomingRequest(`https://downloads.example.com/webhook/marketo?secret=${env.MARKETO_WEBHOOK_SECRET}`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
				body: 'Email+Address=name%40acme.com&leadId=123',
				cf: { country: 'US' },
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true, received: true });

		const event = await env.DB.prepare('SELECT marketo_lead_id, payload FROM marketo_webhook_events').first<{
			marketo_lead_id: string;
			payload: string;
		}>();
		expect(event?.marketo_lead_id).toBe('123');
		expect(event?.payload).toBe('{"fields":["Email Address","leadId"]}');

		const lead = await env.DB.prepare('SELECT email_hash FROM trial_leads').first<{ email_hash: string }>();
		expect(lead?.email_hash).toMatch(/^[A-Za-z0-9_-]{40,}$/);
	});

	it('correlates Marketo and download requests through one hashed lead', async () => {
		await putSampleFile();
		await fetchWorker(
			new IncomingRequest(`https://downloads.example.com/webhook/marketo?secret=${env.MARKETO_WEBHOOK_SECRET}`, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: 'email=name%40acme.com&leadId=123',
			}),
		);
		await fetchWorker(jsonRequest('/api/link', { email: 'Name@Acme.com', file: FILE_KEY }));

		const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM trial_leads').first<{ count: number }>();
		expect(count?.count).toBe(1);
	});

	it('refuses blocked countries on both link issuance and download', async () => {
		await putSampleFile();

		const blocked = await fetchWorker(
			jsonRequest(
				'/api/link',
				{ email: 'name@acme.com', file: FILE_KEY },
				{ cf: { country: 'CN' } },
			),
		);
		expect(blocked.status).toBe(403);
		expect(((await blocked.json()) as { error: string }).error).toBe('country_blocked');

		const issued = await fetchWorker(jsonRequest('/api/link', { email: 'name@acme.com', file: FILE_KEY }));
		const issuedBody = (await issued.json()) as { url: string };
		const download = await fetchWorker(
			new IncomingRequest(issuedBody.url, {
				cf: { country: 'IR' },
			}),
		);
		expect(download.status).toBe(403);
		expect(((await download.json()) as { error: string }).error).toBe('country_blocked');
	});

	it('streams active grants and fails closed for missing, expired, or revoked grants', async () => {
		await putSampleFile();
		const issued = await fetchWorker(jsonRequest('/api/link', { email: 'name@acme.com', file: FILE_KEY }));
		const issuedBody = (await issued.json()) as { url: string };

		const allowed = await fetchWorker(
			new IncomingRequest(issuedBody.url, {
				cf: { country: 'US' },
			}),
		);
		expect(allowed.status).toBe(200);
		expect(await allowed.text()).toBe(FILE_BODY);
		expect(allowed.headers.get('content-disposition')).toContain('sample.bin');

		const missing = await fetchWorker(
			new IncomingRequest('https://downloads.example.com/download/not-a-grant', {
				cf: { country: 'US' },
			}),
		);
		expect(missing.status).toBe(401);
		await missing.json();

		const token = new URL(issuedBody.url).pathname.split('/').at(-1);
		await env.DB.prepare('UPDATE download_grants SET expires_at = 1 WHERE token = ?').bind(token).run();
		const expiredResponse = await fetchWorker(
			new IncomingRequest(issuedBody.url, {
				cf: { country: 'US' },
			}),
		);
		expect(expiredResponse.status).toBe(401);
		await expiredResponse.json();

		await env.DB.prepare("UPDATE download_grants SET status = 'revoked' WHERE token = ?").bind(token).run();
		const revoked = await fetchWorker(new IncomingRequest(issuedBody.url, { cf: { country: 'US' } }));
		expect(revoked.status).toBe(401);
		await revoked.json();

		const direct = await fetchWorker(new IncomingRequest(`https://downloads.example.com/${FILE_KEY}`));
		expect(direct.status).toBe(404);
		await direct.json();
	});

	it('blocks configured IPs when the list is populated', async () => {
		await putSampleFile();
		const original = env.BLOCKED_IPS;
		env.BLOCKED_IPS = '203.0.113.10';

		try {
			const response = await fetchWorker(
				jsonRequest(
					'/api/link',
					{ email: 'name@acme.com', file: FILE_KEY },
					{ headers: { 'CF-Connecting-IP': '203.0.113.10' } },
				),
			);
			expect(response.status).toBe(403);
			expect(((await response.json()) as { error: string }).error).toBe('ip_blocked');
		} finally {
			env.BLOCKED_IPS = original;
		}
	});
});
