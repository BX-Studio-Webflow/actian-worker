import { MAX_JSON_BODY_BYTES } from './config';

const SECRET_HEADER = 'X-Webhook-Secret';
const SECRET_PARAM = 'secret';

export function verifyWebhookSecret(request: Request, url: URL, configured: string | undefined): boolean {
	if (!configured) {
		return false;
	}

	const provided = request.headers.get(SECRET_HEADER) || url.searchParams.get(SECRET_PARAM) || '';
	return provided === configured;
}

export async function readMarketoLead(request: Request): Promise<Record<string, unknown> | null> {
	const text = await request.text();
	if (!text || text.length > MAX_JSON_BODY_BYTES) {
		return null;
	}

	const record = parseMarketoPayload(text, request.headers.get('content-type') || '');
	if (!record) {
		return null;
	}

	const email = typeof record.email === 'string' ? record.email : typeof record.Email === 'string' ? record.Email : '';
	if (!email) {
		return null;
	}

	return record;
}

function parseMarketoPayload(text: string, contentType: string): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(text);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('Expected a JSON object');
		}
		return parsed as Record<string, unknown>;
	} catch {
		if (!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
			return null;
		}

		return Object.fromEntries(new URLSearchParams(text));
	}
}
