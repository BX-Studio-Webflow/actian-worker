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
