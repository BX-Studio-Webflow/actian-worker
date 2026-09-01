import { DEFAULT_LINK_TTL_SECONDS, MAX_JSON_BODY_BYTES, parseAllowlist, parseCsvList, parsePositiveInt } from './config';
import { allowedOrigin, preflightResponse, withCors } from './cors';
import { jsonError, jsonOk, streamDownload } from './download';
import { resolveObjectKey } from './files';
import { evaluateEmailGate, evaluateRequestGate } from './gate';
import { parseDownloadToken, signDownload, toDownloadPath, verifyDownload } from './token';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = allowedOrigin(request, env.CORS_ORIGINS || '*');
		const url = new URL(request.url);
		const method = request.method.toUpperCase();

		if (method === 'OPTIONS') {
			return preflightResponse(origin);
		}

		try {
			if (url.pathname === '/health' && method === 'GET') {
				return withCors(jsonOk({ status: 'ok' }), origin);
			}

			if (url.pathname === '/api/link' && method === 'POST') {
				return withCors(await issueDownloadLink(request, env, url), origin);
			}

			if (url.pathname === '/download' && (method === 'GET' || method === 'HEAD')) {
				return withCors(await handleDownload(request, env, url), origin);
			}

			return withCors(jsonError(404, 'not_found', 'Not found.'), origin);
		} catch (error) {
			console.error('Worker error:', (error as Error).message);
			return withCors(jsonError(500, 'internal_error', 'Request failed.'), origin);
		}
	},
} satisfies ExportedHandler<Env>;

async function issueDownloadLink(request: Request, env: Env, url: URL): Promise<Response> {
	if (!env.TOKEN_SECRET) {
		console.error('TOKEN_SECRET is not configured');
		return jsonError(500, 'misconfigured', 'Download service is not configured.');
	}

	const siteGate = evaluateRequestGate(request, env);
	if (!siteGate.ok) {
		return gatedError(siteGate.reason);
	}

	const body = await readJsonBody(request);
	if (!body) {
		return jsonError(400, 'invalid_request', 'Expected JSON with email and file.');
	}

	const email = typeof body.email === 'string' ? body.email : '';
	const file = typeof body.file === 'string' ? body.file : '';
	const emailGate = evaluateEmailGate(email, parseCsvList(env.EXTRA_BLOCKED_EMAIL_LABELS));
	if (!emailGate.ok) {
		return gatedError(emailGate.reason);
	}

	const objectKey = resolveObjectKey(file, parseAllowlist(env.ALLOWED_FILES));
	if (!objectKey) {
		return jsonError(400, 'invalid_file', 'Unknown or invalid file.');
	}

	const object = await env.DOWNLOADS.head(objectKey);
	if (!object) {
		return jsonError(404, 'not_found', 'File not found.');
	}

	const ttl = parsePositiveInt(env.LINK_TTL_SECONDS, DEFAULT_LINK_TTL_SECONDS);
	const token = await signDownload(env.TOKEN_SECRET, objectKey, ttl);
	const downloadUrl = new URL(toDownloadPath(token), url.origin).toString();

	return jsonOk({
		url: downloadUrl,
		expiresAt: token.exp,
		file: objectKey,
	});
}

async function handleDownload(request: Request, env: Env, url: URL): Promise<Response> {
	if (!env.TOKEN_SECRET) {
		console.error('TOKEN_SECRET is not configured');
		return jsonError(500, 'misconfigured', 'Download service is not configured.');
	}

	const siteGate = evaluateRequestGate(request, env);
	if (!siteGate.ok) {
		return gatedError(siteGate.reason);
	}

	const token = parseDownloadToken(url);
	if (!token) {
		return jsonError(401, 'invalid_token', 'Download link is missing or invalid.');
	}

	const valid = await verifyDownload(env.TOKEN_SECRET, token);
	if (!valid) {
		return jsonError(401, 'invalid_token', 'Download link is invalid or expired.');
	}

	const objectKey = resolveObjectKey(token.file, parseAllowlist(env.ALLOWED_FILES));
	if (!objectKey || objectKey !== token.file) {
		return jsonError(401, 'invalid_token', 'Download link is invalid or expired.');
	}

	return streamDownload(env.DOWNLOADS, objectKey, request);
}

function gatedError(reason: string | undefined): Response {
	switch (reason) {
		case 'email_blocked':
			return jsonError(403, reason, 'Downloads are limited to business email addresses.');
		case 'country_blocked':
			return jsonError(403, reason, 'Downloads are not available in your region.');
		case 'ip_blocked':
			return jsonError(403, reason, 'Downloads are not available from this network.');
		case 'invalid_email':
			return jsonError(400, reason, 'A valid email address is required.');
		default:
			return jsonError(403, 'forbidden', 'Download was not issued.');
	}
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
	const text = await request.text();
	if (!text || text.length > MAX_JSON_BODY_BYTES) {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(text);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return null;
		}
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}
