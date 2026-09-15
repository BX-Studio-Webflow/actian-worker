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

	try {
		const parsed: unknown = JSON.parse(text);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return null;
		}

		const record = parsed as Record<string, unknown>;
		const email = typeof record.email === 'string' ? record.email : typeof record.Email === 'string' ? record.Email : '';
		if (!email) {
			return null;
		}

		return record;
	} catch {
		return null;
	}
}
