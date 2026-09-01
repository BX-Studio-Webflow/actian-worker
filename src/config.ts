/**
 * Confirmed gating lists (Ron, 8/25). IP blocking is empty at launch
 * but can be extended via the BLOCKED_IPS environment variable.
 */

export const BLOCKED_EMAIL_LABELS = [
	'gmail',
	'aol',
	'yahoo',
	'ymail',
	'proton',
	'zoho',
	'fastmail',
	'titan',
	'test',
	'hotmail',
	'icloud',
	'live',
	'outlook',
	'mailinator',
	'guest-post-services',
	'domain',
	'company',
	'mac',
	'me',
	'gmas',
	'ao',
	'ha',
] as const;

export const BLOCKED_COUNTRY_CODES = ['ru', 'sy', 'ir', 'kp', 'by', 'cu', 'cn', 'mm', 'ua', 've'] as const;

export const DEFAULT_LINK_TTL_SECONDS = 600;
export const MAX_JSON_BODY_BYTES = 8192;

export function parseCsvList(value: string | undefined): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(',')
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);
}

export function parseAllowlist(value: string | undefined): Record<string, string> {
	if (!value) {
		return {};
	}

	try {
		const parsed: unknown = JSON.parse(value);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			console.error('ALLOWED_FILES must be a JSON object of alias -> R2 key');
			return {};
		}

		const allowlist: Record<string, string> = {};
		for (const [alias, key] of Object.entries(parsed as Record<string, unknown>)) {
			if (typeof key === 'string' && alias.trim() && key.trim()) {
				allowlist[alias.trim()] = key.trim();
			}
		}
		return allowlist;
	} catch (error) {
		console.error('Failed to parse ALLOWED_FILES:', (error as Error).message);
		return {};
	}
}

export function parsePositiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number.parseInt(value ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return fallback;
	}
	return parsed;
}
