import { BLOCKED_COUNTRY_CODES, BLOCKED_EMAIL_LABELS, parseCsvList } from './config';

export type GateReason = 'email_blocked' | 'country_blocked' | 'ip_blocked' | 'invalid_email';

export interface GateResult {
	ok: boolean;
	reason?: GateReason;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getClientIp(request: Request): string {
	const cfIp = request.headers.get('CF-Connecting-IP');
	if (cfIp) {
		return cfIp.trim();
	}

	const forwarded = request.headers.get('X-Forwarded-For');
	if (!forwarded) {
		return '';
	}

	const [first] = forwarded.split(',');
	return first?.trim() ?? '';
}

export function getClientCountry(request: Request): string {
	const cfCountry = request.cf?.country;
	if (typeof cfCountry === 'string' && cfCountry) {
		return cfCountry.toLowerCase();
	}

	const headerCountry = request.headers.get('CF-IPCountry');
	return headerCountry ? headerCountry.toLowerCase() : '';
}

export function isBlockedCountry(country: string, extraCodes: string[] = []): boolean {
	if (!country) {
		return false;
	}

	const blocked = new Set<string>([...BLOCKED_COUNTRY_CODES, ...extraCodes]);
	return blocked.has(country.toLowerCase());
}

export function isBlockedIp(ip: string, blockedIps: string[]): boolean {
	if (!ip || blockedIps.length === 0) {
		return false;
	}

	return blockedIps.includes(ip.toLowerCase());
}

export function normalizeEmail(email: string): string | null {
	const trimmed = email.trim().toLowerCase();
	if (!EMAIL_PATTERN.test(trimmed)) {
		return null;
	}
	return trimmed;
}

export function isBlockedEmailDomain(email: string, extraLabels: string[] = []): boolean {
	const at = email.lastIndexOf('@');
	if (at < 0) {
		return true;
	}

	const domain = email.slice(at + 1).toLowerCase();
	if (!domain) {
		return true;
	}

	const blocked = [...BLOCKED_EMAIL_LABELS, ...extraLabels];
	const labels = domain.split('.').filter(Boolean);
	const [firstLabel] = labels;
	if (!firstLabel) {
		return true;
	}

	for (const label of labels) {
		if (blocked.includes(label)) {
			return true;
		}
	}

	// Prefix-match longer consumer brands (protonmail.com vs "proton") without
	// catching short labels like "ha" inside harvard.edu.
	for (const blockedLabel of blocked) {
		if (blockedLabel.length >= 4 && firstLabel.startsWith(blockedLabel)) {
			return true;
		}
	}

	return false;
}

export interface RequestGateEnv {
	BLOCKED_IPS?: string;
	EXTRA_BLOCKED_COUNTRIES?: string;
}

export function evaluateRequestGate(request: Request, env: RequestGateEnv): GateResult {
	const country = getClientCountry(request);
	if (isBlockedCountry(country, parseCsvList(env.EXTRA_BLOCKED_COUNTRIES))) {
		return { ok: false, reason: 'country_blocked' };
	}

	if (isBlockedIp(getClientIp(request), parseCsvList(env.BLOCKED_IPS))) {
		return { ok: false, reason: 'ip_blocked' };
	}

	return { ok: true };
}

export function evaluateEmailGate(email: string, extraLabels: string[] = []): GateResult {
	const normalized = normalizeEmail(email);
	if (!normalized) {
		return { ok: false, reason: 'invalid_email' };
	}

	if (isBlockedEmailDomain(normalized, extraLabels)) {
		return { ok: false, reason: 'email_blocked' };
	}

	return { ok: true };
}
