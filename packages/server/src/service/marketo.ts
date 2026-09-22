import { MarketoWebhookRepository } from '../repository/marketo-webhook';
import { TrialLeadRepository } from '../repository/trial-lead';
import { hashEmail } from '../utils/lead';

export class MarketoService {
	public constructor(
		private readonly trialLeads: TrialLeadRepository,
		private readonly webhookEvents: MarketoWebhookRepository,
		private readonly hashSecret: string,
	) {}

	public async receive(input: { email: string; marketoLeadId?: string; payload: Record<string, unknown> }): Promise<void> {
		const emailHash = await hashEmail(input.email, this.hashSecret);
		const lead = await this.trialLeads.upsert(emailHash, input.marketoLeadId);

		await this.webhookEvents.create({
			trialLeadId: lead.id,
			marketoLeadId: input.marketoLeadId,
			payload: { fields: Object.keys(input.payload) },
		});
	}
}
