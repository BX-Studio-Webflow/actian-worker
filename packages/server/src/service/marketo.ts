import { MarketoWebhookRepository } from '../repository/marketo-webhook';
import { TrialLeadRepository } from '../repository/trial-lead';
import { hashEmail } from '../utils/lead';
import { readLeadProfile } from '../utils/webhook';

export class MarketoService {
	public constructor(
		private readonly trialLeads: TrialLeadRepository,
		private readonly webhookEvents: MarketoWebhookRepository,
		private readonly hashSecret: string,
	) {}

	public async receive(input: { email: string; marketoLeadId?: string; payload: Record<string, unknown> }): Promise<void> {
		const emailHash = await hashEmail(input.email, this.hashSecret);
		const profile = readLeadProfile(input.payload);
		const lead = await this.trialLeads.upsert({
			emailHash,
			email: input.email.trim(),
			name: profile.name,
			country: profile.country,
			company: profile.company,
			product: profile.product,
			urlOnSubmit: profile.urlOnSubmit,
			version: profile.version,
			marketoLeadId: input.marketoLeadId,
		});

		await this.webhookEvents.create({
			trialLeadId: lead.id,
			marketoLeadId: input.marketoLeadId,
			payload: input.payload,
		});
	}
}
