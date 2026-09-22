import type { Context } from 'hono';

import { createServices } from '../service';
import type { AppEnv } from '../types';
import { DEFAULT_LINK_TTL_SECONDS, MAX_JSON_BODY_BYTES, parseAllowlist, parseCsvList, parsePositiveInt } from '../utils/config';
import { jsonError, jsonOk, streamDownload } from '../utils/download';
import { mergedAllowlist, resolveObjectKey } from '../utils/files';
import { evaluateEmailGate, evaluateRequestGate } from '../utils/gate';
import { downloadLinkRequestSchema } from '../validators/download';

export async function issueDownloadLink(context: Context<AppEnv>): Promise<Response> {
    if (!context.env.LEAD_HASH_SECRET) {
        console.error('LEAD_HASH_SECRET is not configured');
        return jsonError(500, 'misconfigured', 'Download service is not configured.');
    }

    const siteGate = evaluateRequestGate(context.req.raw, context.env);
    if (!siteGate.ok) {
        return gatedError(siteGate.reason);
    }

    const body = await readDownloadLinkRequest(context.req.raw);
    if (!body) {
        return jsonError(400, 'invalid_request', 'Expected JSON with email and file.');
    }

    const emailGate = evaluateEmailGate(body.email, parseCsvList(context.env.EXTRA_BLOCKED_EMAIL_LABELS));
    if (!emailGate.ok) {
        return gatedError(emailGate.reason);
    }

    const objectKey = resolveObjectKey(body.file, mergedAllowlist(parseAllowlist(context.env.ALLOWED_FILES)));
    if (!objectKey) {
        return jsonError(400, 'invalid_file', 'Unknown or invalid file.');
    }

    const object = await context.env.DOWNLOADS.head(objectKey);
    if (!object) {
        return jsonError(404, 'not_found', 'File not found.');
    }

    const ttl = parsePositiveInt(context.env.LINK_TTL_SECONDS, DEFAULT_LINK_TTL_SECONDS);
    const grant = await createServices(context.env).download.createGrant({
        email: body.email,
        requestedFile: body.file,
        r2ObjectKey: objectKey,
        ttlSeconds: ttl,
    });
    const downloadUrl = new URL(`/download/${grant.token}`, context.req.url).toString();

    return jsonOk({ url: downloadUrl, expiresAt: Math.floor(grant.expiresAt.getTime() / 1000), file: objectKey });
}

export async function download(context: Context<AppEnv>): Promise<Response> {
    if (!context.env.LEAD_HASH_SECRET) {
        console.error('LEAD_HASH_SECRET is not configured');
        return jsonError(500, 'misconfigured', 'Download service is not configured.');
    }

    const siteGate = evaluateRequestGate(context.req.raw, context.env);
    if (!siteGate.ok) {
        return gatedError(siteGate.reason);
    }

    const token = context.req.param('token');
    if (!token) {
        return jsonError(401, 'invalid_token', 'Download link is missing or invalid.');
    }

    const service = createServices(context.env).download;
    const grant = await service.findActiveGrant(token);
    if (!grant) {
        return jsonError(401, 'invalid_token', 'Download link is invalid or expired.');
    }

    await service.markDownloaded(grant.id);
    return streamDownload(context.env.DOWNLOADS, grant.r2ObjectKey, context.req.raw);
}

async function readDownloadLinkRequest(request: Request): Promise<{ email: string; file: string } | null> {
    const text = await request.text();
    if (!text || text.length > MAX_JSON_BODY_BYTES) {
        return null;
    }

    try {
        const result = downloadLinkRequestSchema.safeParse(JSON.parse(text));
        return result.success ? result.data : null;
    } catch {
        return null;
    }
}

function gatedError(reason: string | undefined): Response {
    switch (reason) {
        case 'email_blocked':
            return jsonError(403, reason, 'Downloads are limited to business email addresses.');
        case 'country_blocked':
            return jsonError(403, reason, 'Downloads are not available in your region.');
        case 'ip_blocked':
            return jsonError(403, reason, 'Downloads are not available from this network.');
        case 'invalid_email':
            return jsonError(400, reason, 'A valid email address is required.');
        default:
            return jsonError(403, 'forbidden', 'Download was not issued.');
    }
}
