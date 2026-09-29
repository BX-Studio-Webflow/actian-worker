import { DownloadGrantRepository } from '../repository/download-grant';
import { TrialLeadRepository } from '../repository/trial-lead';
import type { DownloadGrant } from '../schema/schema';
import { createOpaqueToken, hashEmail } from '../utils/lead';

export class DownloadService {
	public constructor(
		private readonly trialLeads: TrialLeadRepository,
		private readonly downloadGrants: DownloadGrantRepository,
		private readonly hashSecret: string,
	) {}

	public async createGrant(input: {
		email: string;
		requestedFile: string;
		r2ObjectKey: string;
		ttlSeconds: number;
		cfCountry?: string;
	}): Promise<DownloadGrant> {
		const emailHash = await hashEmail(input.email, this.hashSecret);
		const lead = await this.trialLeads.upsert({
			emailHash,
			email: input.email.trim(),
			cfCountry: input.cfCountry || undefined,
		});
		const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);

		return this.downloadGrants.create({
			trialLeadId: lead.id,
			token: createOpaqueToken(),
			requestedFile: input.requestedFile,
			r2ObjectKey: input.r2ObjectKey,
			issuedCountry: input.cfCountry || undefined,
			expiresAt,
		});
	}

	public async findActiveGrant(token: string): Promise<DownloadGrant | undefined> {
		const grant = await this.downloadGrants.findByToken(token);
		if (!grant || grant.status !== 'active' || grant.expiresAt.getTime() <= Date.now()) {
			return undefined;
		}

		return grant;
	}

	public async recordDownload(grant: DownloadGrant, cfCountry: string): Promise<void> {
		const downloadedAt = new Date();
		await this.downloadGrants.markDownloaded(grant.id, downloadedAt, cfCountry || undefined);
		if (cfCountry) {
			await this.trialLeads.setCfCountry(grant.trialLeadId, cfCountry);
		}
	}
}

export interface DownloadAttribution {
	email: string;
	downloadName: string;
	fileName: string;
	downloadedAt: Date;
}
