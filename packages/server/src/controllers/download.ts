import type { Context } from 'hono';

import type { AppEnv } from '../types';
import { DEFAULT_LINK_TTL_SECONDS, MAX_JSON_BODY_BYTES, parseAllowlist, parseCsvList, parsePositiveInt } from '../utils/config';
import { jsonError, jsonOk, streamDownload } from '../utils/download';
import { mergedAllowlist, resolveObjectKey } from '../utils/files';
import { evaluateEmailGate, evaluateRequestGate } from '../utils/gate';
import { parseDownloadToken, signDownload, toDownloadPath, verifyDownload } from '../utils/token';
import { downloadLinkRequestSchema } from '../validators/download';

export async function issueDownloadLink(context: Context<AppEnv>): Promise<Response> {
    if (!context.env.TOKEN_SECRET) {
        console.error('TOKEN_SECRET is not configured');
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
    const token = await signDownload(context.env.TOKEN_SECRET, objectKey, ttl);
    const downloadUrl = new URL(toDownloadPath(token), context.req.url).toString();

    return jsonOk({ url: downloadUrl, expiresAt: token.exp, file: objectKey });
}

export async function download(context: Context<AppEnv>): Promise<Response> {
    if (!context.env.TOKEN_SECRET) {
        console.error('TOKEN_SECRET is not configured');
        return jsonError(500, 'misconfigured', 'Download service is not configured.');
    }

    const siteGate = evaluateRequestGate(context.req.raw, context.env);
    if (!siteGate.ok) {
        return gatedError(siteGate.reason);
    }

    const token = parseDownloadToken(new URL(context.req.url));
    if (!token) {
        return jsonError(401, 'invalid_token', 'Download link is missing or invalid.');
    }

    const valid = await verifyDownload(context.env.TOKEN_SECRET, token);
    if (!valid) {
        return jsonError(401, 'invalid_token', 'Download link is invalid or expired.');
    }

    const objectKey = resolveObjectKey(token.file, mergedAllowlist(parseAllowlist(context.env.ALLOWED_FILES)));
    if (!objectKey || objectKey !== token.file) {
        return jsonError(401, 'invalid_token', 'Download link is invalid or expired.');
    }

    return streamDownload(context.env.DOWNLOADS, objectKey, context.req.raw);
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
