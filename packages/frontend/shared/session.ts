export const EMAIL_STORAGE_KEY = 'actian-trial-email';
export const COUNTRY_STORAGE_KEY = 'actian-trial-country';

/** ISO codes from the launch blocklist, plus the Marketo Country picklist labels. */
const BLOCKED_COUNTRIES = new Set([
	'ru',
	'russia',
	'sy',
	'syria',
	'ir',
	'iran',
	'kp',
	'korea, north',
	'by',
	'belarus',
	'cu',
	'cuba',
	'cn',
	'china',
	'mm',
	'myanmar',
	'ua',
	'ukraine',
	've',
	'venezuela',
]);

export function isBlockedTrialCountry(country: string): boolean {
	return BLOCKED_COUNTRIES.has(country.trim().toLowerCase());
}

const BLOCKED_EMAIL_LABELS = [
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
];

export function isBlockedTrialEmail(email: string): boolean {
	const at = email.lastIndexOf('@');
	if (at < 0) {
		return false;
	}

	const domain = email.slice(at + 1).toLowerCase();
	const labels = domain.split('.').filter(Boolean);
	const [firstLabel] = labels;
	if (!firstLabel) {
		return false;
	}

	if (labels.some((label) => BLOCKED_EMAIL_LABELS.includes(label))) {
		return true;
	}

	return BLOCKED_EMAIL_LABELS.some((label) => label.length >= 4 && firstLabel.startsWith(label));
}
