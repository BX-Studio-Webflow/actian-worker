import { drizzle } from 'drizzle-orm/d1';

import { DownloadGrantRepository } from '../repository/download-grant';
import { MarketoWebhookRepository } from '../repository/marketo-webhook';
import { TrialLeadRepository } from '../repository/trial-lead';
import { schema } from '../schema/schema';
import type { AppEnv } from '../types';
import { DownloadService } from './download';
import { MarketoService } from './marketo';

export function createServices(env: AppEnv['Bindings']): { download: DownloadService; marketo: MarketoService } {
	if (!env.LEAD_HASH_SECRET) {
		throw new Error('LEAD_HASH_SECRET is not configured');
	}

	const db = drizzle(env.DB, { schema });
	const trialLeads = new TrialLeadRepository(db);

	return {
		download: new DownloadService(trialLeads, new DownloadGrantRepository(db), env.LEAD_HASH_SECRET),
		marketo: new MarketoService(trialLeads, new MarketoWebhookRepository(db), env.LEAD_HASH_SECRET),
	};
}
