import type { DownloadAttribution } from '../service/download';
import type { AppEnv } from '../types';

const DOWNLOAD_NAME_FIELD = 'ESD_Download_Marketo__c';
const FILE_NAME_FIELD = 'flexField1';
const DOWNLOAD_DATE_FIELD = 'ESD_Download_Date__c';

export async function pushDownloadAttribution(env: AppEnv['Bindings'], attribution: DownloadAttribution | null): Promise<void> {
	if (!attribution) {
		return;
	}

	const baseUrl = env.MARKETO_BASE_URL?.replace(/\/$/, '');
	const clientId = env.MARKETO_CLIENT_ID;
	const clientSecret = env.MARKETO_CLIENT_SECRET;
	if (!baseUrl || !clientId || !clientSecret) {
		return;
	}

	try {
		const token = await marketoAccessToken(baseUrl, clientId, clientSecret);
		const response = await fetch(`${baseUrl}/rest/v1/leads.json`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				action: 'updateOnly',
				lookupField: 'email',
				input: [
					{
						email: attribution.email,
						[DOWNLOAD_NAME_FIELD]: attribution.downloadName,
						[FILE_NAME_FIELD]: attribution.fileName,
						[DOWNLOAD_DATE_FIELD]: marketoTimestamp(attribution.downloadedAt),
					},
				],
			}),
		});

		const body = await response.text();
		if (!response.ok) {
			console.error('Marketo attribution failed', response.status, body.slice(0, 500));
			return;
		}

		const parsed = JSON.parse(body) as { success?: boolean; result?: Array<{ status?: string; reasons?: unknown[] }> };
		const status = parsed.result?.[0]?.status;
		if (!parsed.success || status === 'skipped') {
			console.error('Marketo attribution was not applied', body.slice(0, 500));
		}
	} catch (error) {
		console.error('Marketo attribution failed', error instanceof Error ? error.message : 'unknown error');
	}
}

async function marketoAccessToken(baseUrl: string, clientId: string, clientSecret: string): Promise<string> {
	const url = new URL('/identity/oauth/token', baseUrl);
	url.searchParams.set('grant_type', 'client_credentials');
	url.searchParams.set('client_id', clientId);
	url.searchParams.set('client_secret', clientSecret);

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Marketo token request failed (${response.status})`);
	}

	const body = (await response.json()) as { access_token?: string };
	if (!body.access_token) {
		throw new Error('Marketo token response did not include an access token');
	}

	return body.access_token;
}

function marketoTimestamp(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
