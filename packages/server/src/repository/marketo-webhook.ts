import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { type MarketoWebhookEvent, marketoWebhookEvents, schema } from '../schema/schema';

export class MarketoWebhookRepository {
    public constructor(private readonly db: DrizzleD1Database<typeof schema>) { }

    public async create(input: {
        trialLeadId: number;
        marketoLeadId?: string;
        payload: Record<string, unknown>;
    }): Promise<MarketoWebhookEvent> {
        const event = await this.db.insert(marketoWebhookEvents).values(input).returning().get();
        if (!event) {
            throw new Error('Could not persist Marketo webhook event.');
        }

        return event;
    }
}
