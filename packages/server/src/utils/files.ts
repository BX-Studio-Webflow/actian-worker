import { FILE_CATALOG } from './catalog';

const KEY_PATTERN = /^[a-zA-Z0-9._\-/]+$/;

export function sanitizeObjectKey(key: string): string | null {
	const trimmed = key.trim();
	if (!trimmed || trimmed.length > 512) {
		return null;
	}

	if (trimmed.startsWith('/') || trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('\0')) {
		return null;
	}

	if (!KEY_PATTERN.test(trimmed)) {
		return null;
	}

	return trimmed;
}

export function mergedAllowlist(extra: Record<string, string> = {}): Record<string, string> {
	return { ...FILE_CATALOG, ...extra };
}

export function resolveObjectKey(requested: string, allowlist: Record<string, string>): string | null {
	const sanitized = sanitizeObjectKey(requested);
	if (!sanitized) {
		return null;
	}

	const aliases = Object.keys(allowlist);
	if (aliases.length === 0) {
		return sanitized;
	}

	const mapped = allowlist[sanitized];
	if (mapped) {
		return sanitizeObjectKey(mapped);
	}

	if (Object.values(allowlist).includes(sanitized)) {
		return sanitized;
	}

	return null;
}

export function fileNameFromKey(key: string): string {
	const segments = key.split('/');
	return segments[segments.length - 1] || key;
}
