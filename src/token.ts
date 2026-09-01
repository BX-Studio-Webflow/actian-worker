const encoder = new TextEncoder();

export interface SignedDownload {
	file: string;
	exp: number;
	nonce: string;
	sig: string;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function bytesToHex(bytes: ArrayBuffer): string {
	return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array | null {
	if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
		return null;
	}

	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) {
		return false;
	}

	let diff = 0;
	for (let i = 0; i < a.byteLength; i++) {
		diff |= a[i] ^ b[i];
	}
	return diff === 0;
}

export function signingPayload(file: string, exp: number, nonce: string): string {
	return `${file}\n${exp}\n${nonce}`;
}

export async function signDownload(secret: string, file: string, ttlSeconds: number): Promise<SignedDownload> {
	const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
	const nonce = crypto.randomUUID();
	const key = await importHmacKey(secret);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingPayload(file, exp, nonce)));

	return {
		file,
		exp,
		nonce,
		sig: bytesToHex(signature),
	};
}

export async function verifyDownload(secret: string, token: SignedDownload, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
	if (!token.file || !token.sig || !token.nonce || !Number.isFinite(token.exp)) {
		return false;
	}

	if (token.exp <= nowSeconds) {
		return false;
	}

	const provided = hexToBytes(token.sig);
	if (!provided) {
		return false;
	}

	const key = await importHmacKey(secret);
	const expected = new Uint8Array(
		await crypto.subtle.sign('HMAC', key, encoder.encode(signingPayload(token.file, token.exp, token.nonce))),
	);

	return timingSafeEqual(provided, expected);
}

export function toDownloadPath(token: SignedDownload): string {
	const params = new URLSearchParams({
		f: token.file,
		e: String(token.exp),
		n: token.nonce,
		s: token.sig,
	});
	return `/download?${params.toString()}`;
}

export function parseDownloadToken(url: URL): SignedDownload | null {
	const file = url.searchParams.get('f');
	const exp = Number.parseInt(url.searchParams.get('e') ?? '', 10);
	const nonce = url.searchParams.get('n');
	const sig = url.searchParams.get('s');

	if (!file || !nonce || !sig || !Number.isFinite(exp)) {
		return null;
	}

	return { file, exp, nonce, sig };
}
