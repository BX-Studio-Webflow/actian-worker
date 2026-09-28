import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { type DownloadGrant, downloadGrants, schema } from '../schema/schema';

export class DownloadGrantRepository {
	public constructor(private readonly db: DrizzleD1Database<typeof schema>) {}

	public async create(input: {
		trialLeadId: number;
		token: string;
		requestedFile: string;
		r2ObjectKey: string;
		issuedCountry?: string;
		expiresAt: Date;
	}): Promise<DownloadGrant> {
		const grant = await this.db.insert(downloadGrants).values(input).returning().get();
		if (!grant) {
			throw new Error('Could not create download grant.');
		}

		return grant;
	}

	public findByToken(token: string): Promise<DownloadGrant | undefined> {
		return this.db.select().from(downloadGrants).where(eq(downloadGrants.token, token)).get();
	}

	public markDownloaded(id: number, downloadedAt: Date, downloadCountry?: string): Promise<unknown> {
		return this.db
			.update(downloadGrants)
			.set({
				downloadedAt,
				downloadCountry: downloadCountry || sql`${downloadGrants.downloadCountry}`,
				updatedAt: sql`(unixepoch())`,
			})
			.where(eq(downloadGrants.id, id));
	}
}
