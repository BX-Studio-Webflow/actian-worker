import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { schema, type TrialLead, trialLeads } from '../schema/schema';

export class TrialLeadRepository {
	public constructor(private readonly db: DrizzleD1Database<typeof schema>) {}

	public async upsert(emailHash: string, marketoLeadId?: string): Promise<TrialLead> {
		const lead = await this.db
			.insert(trialLeads)
			.values({ emailHash, marketoLeadId })
			.onConflictDoUpdate({
				target: trialLeads.emailHash,
				set: {
					marketoLeadId: marketoLeadId ?? sql`${trialLeads.marketoLeadId}`,
					updatedAt: sql`(unixepoch())`,
				},
			})
			.returning()
			.get();

		if (!lead) {
			throw new Error('Could not create or find trial lead.');
		}

		return lead;
	}

	public findByEmailHash(emailHash: string): Promise<TrialLead | undefined> {
		return this.db.select().from(trialLeads).where(eq(trialLeads.emailHash, emailHash)).get();
	}
}
