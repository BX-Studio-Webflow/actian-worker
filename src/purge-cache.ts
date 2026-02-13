/**
 * Cloudflare Cache Purge Utilities
 * Handles purging Cloudflare's edge cache for the website
 */

/**
 * Purge all cached content from Cloudflare
 *
 * @param zoneId - Cloudflare Zone ID
 * @param apiToken - Cloudflare API Token with cache purge permissions
 * @returns Promise with purge result
 */
export async function purgeCloudflareCache(
	zoneId: string,
	apiToken: string,
): Promise<{
	success: boolean;
	message: string;
	details?: string;
}> {
	// Validate inputs
	if (!zoneId || !apiToken) {
		return {
			success: false,
			message: 'Missing required parameters: zoneId and apiToken',
		};
	}

	const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				purge_everything: true,
			}),
		});

		const data = (await response.json()) as {
			success: boolean;
			errors: Array<{ message: string }>;
			messages?: string[];
		};

		if (!response.ok || !data.success) {
			const errorMessage = data.errors && data.errors.length > 0 ? data.errors[0].message : 'Failed to purge cache';

			return {
				success: false,
				message: 'Cloudflare API error',
				details: errorMessage,
			};
		}

		return {
			success: true,
			message: 'Cache purged successfully',
			details: data.messages ? data.messages.join(', ') : 'All cache cleared',
		};
	} catch (error) {
		return {
			success: false,
			message: 'Request failed',
			details: (error as Error).message,
		};
	}
}

/**
 * Create error response for cache purge endpoint
 */
export function errorResponse(status: number, message: string): Response {
	return new Response(JSON.stringify({ success: false, message }), {
		status: status,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Create success response for cache purge endpoint
 */
export function successResponse(data: object): Response {
	return new Response(JSON.stringify({ success: true, ...data }), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
