import { DownloadGrantRepository } from '../repository/download-grant';
import { TrialLeadRepository } from '../repository/trial-lead';
import type { DownloadGrant } from '../schema/schema';
import { createOpaqueToken, hashEmail } from '../utils/lead';

export class DownloadService {
    public constructor(
        private readonly trialLeads: TrialLeadRepository,
        private readonly downloadGrants: DownloadGrantRepository,
        private readonly hashSecret: string,
    ) { }

    public async createGrant(input: {
        email: string;
        requestedFile: string;
        r2ObjectKey: string;
        ttlSeconds: number;
    }): Promise<DownloadGrant> {
        const emailHash = await hashEmail(input.email, this.hashSecret);
        const lead = await this.trialLeads.upsert(emailHash);
        const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);

        return this.downloadGrants.create({
            trialLeadId: lead.id,
            token: createOpaqueToken(),
            requestedFile: input.requestedFile,
            r2ObjectKey: input.r2ObjectKey,
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

    public markDownloaded(grantId: number): Promise<unknown> {
        return this.downloadGrants.markDownloaded(grantId);
    }
}
