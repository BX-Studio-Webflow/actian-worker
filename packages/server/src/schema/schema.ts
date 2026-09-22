import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const createdAt = integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);
const updatedAt = integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);

export const trialLeads = sqliteTable(
    'trial_leads',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        emailHash: text('email_hash').notNull(),
        marketoLeadId: text('marketo_lead_id'),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex('trial_leads_email_hash_unique').on(table.emailHash),
        uniqueIndex('trial_leads_marketo_lead_id_unique').on(table.marketoLeadId),
    ],
);

export const marketoWebhookEvents = sqliteTable(
    'marketo_webhook_events',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        trialLeadId: integer('trial_lead_id')
            .notNull()
            .references(() => trialLeads.id, { onDelete: 'cascade' }),
        marketoLeadId: text('marketo_lead_id'),
        payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
        status: text('status', { enum: ['received', 'processed', 'failed'] })
            .notNull()
            .default('received'),
        error: text('error'),
        createdAt,
        updatedAt,
    },
    (table) => [
        index('marketo_webhook_events_trial_lead_id_index').on(table.trialLeadId),
        index('marketo_webhook_events_marketo_lead_id_index').on(table.marketoLeadId),
    ],
);

export const downloadGrants = sqliteTable(
    'download_grants',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        trialLeadId: integer('trial_lead_id')
            .notNull()
            .references(() => trialLeads.id, { onDelete: 'cascade' }),
        token: text('token').notNull(),
        requestedFile: text('requested_file').notNull(),
        r2ObjectKey: text('r2_object_key').notNull(),
        status: text('status', { enum: ['active', 'revoked'] })
            .notNull()
            .default('active'),
        expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
        downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex('download_grants_token_unique').on(table.token),
        index('download_grants_trial_lead_id_index').on(table.trialLeadId),
        index('download_grants_active_expiry_index').on(table.status, table.expiresAt),
    ],
);

export const trialLeadRelations = relations(trialLeads, ({ many }) => ({
    marketoWebhookEvents: many(marketoWebhookEvents),
    downloadGrants: many(downloadGrants),
}));

export const marketoWebhookEventRelations = relations(marketoWebhookEvents, ({ one }) => ({
    trialLead: one(trialLeads, {
        fields: [marketoWebhookEvents.trialLeadId],
        references: [trialLeads.id],
    }),
}));

export const downloadGrantRelations = relations(downloadGrants, ({ one }) => ({
    trialLead: one(trialLeads, {
        fields: [downloadGrants.trialLeadId],
        references: [trialLeads.id],
    }),
}));

export type TrialLead = typeof trialLeads.$inferSelect;
export type DownloadGrant = typeof downloadGrants.$inferSelect;
export type MarketoWebhookEvent = typeof marketoWebhookEvents.$inferSelect;

export const schema = {
    trialLeads,
    marketoWebhookEvents,
    downloadGrants,
    trialLeadRelations,
    marketoWebhookEventRelations,
    downloadGrantRelations,
};
