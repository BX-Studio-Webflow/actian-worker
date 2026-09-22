import { MAX_JSON_BODY_BYTES } from './config';

const SECRET_HEADER = 'X-Webhook-Secret';
const SECRET_PARAM = 'secret';

export interface MarketoLead {
	email: string;
	payload: Record<string, unknown>;
}

export function verifyWebhookSecret(request: Request, url: URL, configured: string | undefined): boolean {
	if (!configured) {
		return false;
	}

	const provided = request.headers.get(SECRET_HEADER) || url.searchParams.get(SECRET_PARAM) || '';
	return provided === configured;
}

export async function readMarketoLead(request: Request): Promise<MarketoLead | null> {
	const text = await request.text();
	if (!text || text.length > MAX_JSON_BODY_BYTES) {
		return null;
	}

	const record = parseMarketoPayload(text, request.headers.get('content-type') || '');
	if (!record) {
		return null;
	}

	const email = findEmail(record);
	if (!email) {
		return null;
	}

	return { email, payload: record };
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

function findEmail(record: Record<string, unknown>): string {
	for (const [key, value] of Object.entries(record)) {
		const normalizedKey = key.replace(/[^a-z]/gi, '').toLowerCase();
		if ((normalizedKey === 'email' || normalizedKey === 'emailaddress') && typeof value === 'string' && value.trim()) {
			return value;
		}
	}

	return '';
}

export function findMarketoLeadId(record: Record<string, unknown>): string | undefined {
	for (const [key, value] of Object.entries(record)) {
		if (key.replace(/[^a-z]/gi, '').toLowerCase() === 'leadid' && typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}

	return undefined;
}
