export interface DownloadLinkResponse {
	ok: boolean;
	url?: string;
	error?: string;
	message?: string;
}

export async function requestDownloadLink(apiOrigin: string, email: string, file: string): Promise<DownloadLinkResponse> {
	const response = await fetch(`${apiOrigin}/api/link`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({ email, file }),
	});

	const body = (await response.json()) as DownloadLinkResponse;
	return {
		ok: response.ok && Boolean(body.url),
		url: body.url,
		error: body.error,
		message: body.message,
	};
}
