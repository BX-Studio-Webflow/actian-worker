import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { schema, type TrialLead, trialLeads } from '../schema/schema';

export class TrialLeadRepository {
	public constructor(private readonly db: DrizzleD1Database<typeof schema>) {}

	public async upsert(input: {
		emailHash: string;
		email?: string;
		name?: string;
		country?: string;
		cfCountry?: string;
		marketoLeadId?: string;
	}): Promise<TrialLead> {
		const lead = await this.db
			.insert(trialLeads)
			.values(input)
			.onConflictDoUpdate({
				target: trialLeads.emailHash,
				set: {
					email: input.email ?? sql`${trialLeads.email}`,
					name: input.name ?? sql`${trialLeads.name}`,
					country: input.country ?? sql`${trialLeads.country}`,
					cfCountry: input.cfCountry ?? sql`${trialLeads.cfCountry}`,
					marketoLeadId: input.marketoLeadId ?? sql`${trialLeads.marketoLeadId}`,
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

	public findById(id: number): Promise<TrialLead | undefined> {
		return this.db.select().from(trialLeads).where(eq(trialLeads.id, id)).get();
	}

	public setCfCountry(id: number, cfCountry: string): Promise<unknown> {
		return this.db
			.update(trialLeads)
			.set({ cfCountry, updatedAt: sql`(unixepoch())` })
			.where(eq(trialLeads.id, id));
	}
}
