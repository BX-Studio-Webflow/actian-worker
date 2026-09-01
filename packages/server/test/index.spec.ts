import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import { isBlockedCountry, isBlockedEmailDomain, isBlockedIp, normalizeEmail } from '../src/gate';
import worker from '../src/index';
import { signDownload, toDownloadPath, verifyDownload } from '../src/token';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const TEST_SECRET = 'test-secret-do-not-use-in-production';
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

describe('signed download tokens', () => {
	it('accepts a fresh signature and rejects expiry or tampering', async () => {
		const token = await signDownload(TEST_SECRET, FILE_KEY, 60);
		expect(await verifyDownload(TEST_SECRET, token)).toBe(true);
		expect(await verifyDownload(TEST_SECRET, { ...token, file: 'other.bin' })).toBe(false);
		expect(await verifyDownload(TEST_SECRET, { ...token, sig: 'ab' })).toBe(false);
		expect(await verifyDownload(TEST_SECRET, token, token.exp + 1)).toBe(false);
	});
});

describe('download Worker', () => {
	it('issues a signed link after a cleared business-email submission', async () => {
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
		expect(body.url).toContain('/download?');
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

		const token = await signDownload(TEST_SECRET, FILE_KEY, 60);
		const download = await fetchWorker(
			new IncomingRequest(`https://downloads.example.com${toDownloadPath(token)}`, {
				cf: { country: 'IR' },
			}),
		);
		expect(download.status).toBe(403);
		expect(((await download.json()) as { error: string }).error).toBe('country_blocked');
	});

	it('streams the R2 object for a valid token and fails closed otherwise', async () => {
		await putSampleFile();
		const token = await signDownload(TEST_SECRET, FILE_KEY, 60);

		const allowed = await fetchWorker(
			new IncomingRequest(`https://downloads.example.com${toDownloadPath(token)}`, {
				cf: { country: 'US' },
			}),
		);
		expect(allowed.status).toBe(200);
		expect(await allowed.text()).toBe(FILE_BODY);
		expect(allowed.headers.get('content-disposition')).toContain('sample.bin');

		const missing = await fetchWorker(
			new IncomingRequest(`https://downloads.example.com/download?f=${FILE_KEY}`, {
				cf: { country: 'US' },
			}),
		);
		expect(missing.status).toBe(401);
		await missing.json();

		const expired = await signDownload(TEST_SECRET, FILE_KEY, 60);
		const expiredResponse = await fetchWorker(
			new IncomingRequest(`https://downloads.example.com${toDownloadPath({ ...expired, exp: 1, sig: expired.sig })}`, {
				cf: { country: 'US' },
			}),
		);
		expect(expiredResponse.status).toBe(401);
		await expiredResponse.json();

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
