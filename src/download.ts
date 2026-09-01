import { fileNameFromKey } from './files';

function isR2ObjectBody(object: R2Object | R2ObjectBody): object is R2ObjectBody {
	return 'body' in object && object.body !== undefined;
}

export async function streamDownload(bucket: R2Bucket, key: string, request: Request): Promise<Response> {
	const method = request.method.toUpperCase();

	if (method === 'HEAD') {
		const object = await bucket.head(key);
		if (!object) {
			return jsonError(404, 'not_found', 'File not found.');
		}

		const headers = downloadHeaders(object, key);
		headers.set('Content-Length', String(object.size));
		return new Response(null, { status: 200, headers });
	}

	const rangeHeader = request.headers.get('Range');
	const object = await bucket.get(key, rangeHeader ? { range: request.headers, onlyIf: request.headers } : { onlyIf: request.headers });

	if (object === null) {
		return jsonError(404, 'not_found', 'File not found.');
	}

	const headers = downloadHeaders(object, key);
	headers.set('etag', object.httpEtag);

	if (!isR2ObjectBody(object)) {
		return new Response(null, { status: 304, headers });
	}

	if (rangeHeader && object.range && 'offset' in object.range) {
		const offset = object.range.offset ?? 0;
		const length = object.range.length ?? object.size - offset;
		const end = offset + length - 1;
		headers.set('Content-Range', `bytes ${offset}-${end}/${object.size}`);
		headers.set('Content-Length', String(length));
		return new Response(object.body, { status: 206, headers });
	}

	headers.set('Content-Length', String(object.size));
	return new Response(object.body, { status: 200, headers });
}

function downloadHeaders(object: R2Object, key: string): Headers {
	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('Cache-Control', 'private, no-store');
	headers.set('Accept-Ranges', 'bytes');
	headers.set('X-Content-Type-Options', 'nosniff');

	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/octet-stream');
	}

	if (!headers.has('Content-Disposition')) {
		headers.set('Content-Disposition', `attachment; filename="${fileNameFromKey(key)}"`);
	}

	return headers;
}

export function jsonError(status: number, error: string, message: string): Response {
	return new Response(JSON.stringify({ ok: false, error, message }), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	});
}

export function jsonOk(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify({ ok: true, ...body }), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
		},
	});
}
