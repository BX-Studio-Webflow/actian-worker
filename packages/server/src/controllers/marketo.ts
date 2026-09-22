import type { Context } from 'hono';

import type { AppEnv } from '../types';
import { jsonError, jsonOk } from '../utils/download';
import { readMarketoLead, verifyWebhookSecret } from '../utils/webhook';

export async function receiveMarketoWebhook(context: Context<AppEnv>): Promise<Response> {
	if (!context.env.MARKETO_WEBHOOK_SECRET) {
		console.error('MARKETO_WEBHOOK_SECRET is not configured');
		return jsonError(500, 'misconfigured', 'Webhook is not configured.');
	}

	if (!verifyWebhookSecret(context.req.raw, new URL(context.req.url), context.env.MARKETO_WEBHOOK_SECRET)) {
		return jsonError(401, 'invalid_secret', 'Invalid webhook secret.');
	}

	const lead = await readMarketoLead(context.req.raw);
	if (!lead) {
		return jsonError(400, 'invalid_request', 'Expected JSON or form data with an email field.');
	}

	console.log('Marketo lead submission:', JSON.stringify({ ...lead, receivedAt: new Date().toISOString() }));
	return jsonOk({ received: true });
}
