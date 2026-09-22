const textEncoder = new TextEncoder();

export async function hashEmail(email: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(email.trim().toLowerCase()));

    return toBase64Url(new Uint8Array(signature));
}

export function createOpaqueToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
