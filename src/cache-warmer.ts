/**
 * ============================================
 * CACHE WARMER MODULE
 * ============================================
 *
 * Scheduled cache warming functionality to keep pages cached at edge.
 * Fetches URLs from sitemap and warms cache periodically.
 */

// ============================================
// TYPES
// ============================================

export interface WarmResult {
	url: string;
	status?: number;
	cacheStatus?: string;
	duration?: string;
	error?: string;
}

export interface WarmStats {
	successful: number;
	failed: number;
	hits: number;
	misses: number;
	avgDuration: string;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_BATCH_SIZE = 5;
const BATCH_DELAY_MS = 100;

// Fallback URLs if sitemap is unavailable
const FALLBACK_PATHS = ['/', '/about', '/pricing', '/contact', '/ai-customer-support', '/success-stories', '/careers'];

// ============================================
// SITEMAP FETCHING
// ============================================

/**
 * Fetch sitemap and extract URLs
 */
export async function getUrlsFromSitemap(domain: string): Promise<string[]> {
	const sitemapUrl = `https://${domain}/sitemap.xml`;

	try {
		const response = await fetch(sitemapUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Cache-Warmer)',
				Accept: 'application/xml,text/xml,*/*',
			},
		});

		if (!response.ok) {
			console.error(`Sitemap fetch failed with status ${response.status}`);
			return getFallbackUrls(domain);
		}

		const text = await response.text();
		const urls: string[] = [];

		// Extract URLs from <loc> tags
		const regex = /<loc>(.*?)<\/loc>/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const url = match[1].trim();
			if (url) {
				urls.push(url);
			}
		}

		if (urls.length === 0) {
			console.error('No URLs found in sitemap, using fallback');
			return getFallbackUrls(domain);
		}

		return urls;
	} catch (error) {
		console.error('Sitemap fetch error:', (error as Error).message);
		return getFallbackUrls(domain);
	}
}

/**
 * Fallback URLs if sitemap is unavailable
 */
function getFallbackUrls(domain: string): string[] {
	const urls = FALLBACK_PATHS.map((path) => `https://${domain}${path}`);

	return urls;
}

// ============================================
// CACHE WARMING
// ============================================

/**
 * Warm cache by fetching URLs in batches
 */
export async function warmCache(urls: string[], batchSize: number = DEFAULT_BATCH_SIZE): Promise<WarmResult[]> {
	const results: WarmResult[] = [];

	// Process URLs in batches to avoid overwhelming the origin
	for (let i = 0; i < urls.length; i += batchSize) {
		const batch = urls.slice(i, i + batchSize);

		const batchPromises = batch.map((url) => warmSingleUrl(url));
		const batchResults = await Promise.all(batchPromises);

		results.push(...batchResults);

		// Small delay between batches to be respectful
		if (i + batchSize < urls.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
		}
	}

	return results;
}

/**
 * Warm cache for a single URL
 */
async function warmSingleUrl(url: string): Promise<WarmResult> {
	try {
		const startTime = Date.now();

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Cache-Warmer)',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
			},
			cf: {
				cacheEverything: true,
			},
		});

		const duration = Date.now() - startTime;
		const cacheStatus = response.headers.get('cf-cache-status') || response.headers.get('x-cache') || 'UNKNOWN';

		return {
			url,
			status: response.status,
			cacheStatus,
			duration: `${duration}ms`,
		};
	} catch (error) {
		return {
			url,
			error: (error as Error).message,
		};
	}
}

// ============================================
// STATISTICS
// ============================================

/**
 * Calculate statistics from warm results
 */
export function calculateStats(results: WarmResult[]): WarmStats {
	const successful = results.filter((r) => r.status && r.status >= 200 && r.status < 400).length;
	const failed = results.filter((r) => r.error || !r.status || r.status >= 400).length;

	const hits = results.filter((r) => r.cacheStatus === 'HIT').length;
	const misses = results.filter((r) => r.cacheStatus && r.cacheStatus !== 'HIT' && r.cacheStatus !== 'UNKNOWN').length;

	const durations = results.filter((r) => r.duration).map((r) => parseInt(r.duration!.replace('ms', ''), 10));

	const avgDuration = durations.length > 0 ? `${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}ms` : '0ms';

	return {
		successful,
		failed,
		hits,
		misses,
		avgDuration,
	};
}
