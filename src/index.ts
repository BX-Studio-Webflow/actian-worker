/**
 * ============================================
 * CLOUDFLARE WORKER: IMAGE OPTIMIZATION FOR WEBFLOW
 * ============================================
 *
 * Version: 4.3 (Production-Ready)
 *
 * Copyright (c) 2025 BX Studio
 * Licensed under the MIT License
 * See LICENSE file for full license text
 *
 * WHAT THIS DOES:
 *
 * 1. HTML Processing:
 *    - Intercepts HTML responses from your Webflow site
 *    - Rewrites Webflow CDN image URLs to use Cloudflare optimization
 *    - Handles all image contexts: src, data-src, srcset, data-srcset, CSS backgrounds, <style> blocks
 *    - Optimizes OG/Twitter images (meta tags) with JPEG default for better social media compatibility
 *
 * 2. Image Optimization:
 *    - Transforms PNG, JPG, WebP, GIF via Cloudflare Image Resizing
 *    - Sanitises SVG files via Cloudflare Image Resizing (no format conversion - SVGs are inherently scalable)
 *    - Uses format=auto to serve AVIF/WebP based on browser support
 *    - Proxies original images through /img-original/ for edge caching
 *    - Transforms from cached originals for better performance
 *
 * 3. AVIF Support:
 *    - Proxies AVIF images via /img-cache/ (no transformation - already optimal)
 *    - Caches AVIF images on your domain for fast delivery
 *    - Handles CORS for cross-origin usage
 *
 * 4. Asset Proxying:
 *    - Proxies CSS, JavaScript, fonts (woff, woff2, ttf, otf, eot), and icons
 *    - Rewrites Webflow CDN asset URLs to use /asset-cache/ proxy
 *    - Caches assets on your domain for fast edge delivery
 *    - Handles CORS for cross-origin usage
 *
 * 5. Caching Strategy:
 *    - HTML responses: Cached at Cloudflare edge
 *    - Original images: Proxied through /img-original/, cached at edge
 *    - Transformed images: Cached at edge via Cloudflare Image Resizing
 *    - AVIF images: Proxied and cached at edge
 *    - Assets: Proxied and cached at edge
 *
 * NOTE: Cache Reserve is NOT available when using O2O (Origin-to-Origin) proxying.
 * Webflow uses O2O, so all assets cache at Cloudflare edge only (not R2-backed Cache Reserve).
 *
 * CONFIGURATION:
 *
 * Set these environment variables in Cloudflare Dashboard (Workers → Settings → Variables):
 *
 * REQUIRED:
 * - DOMAIN: Your domain (e.g., "www.bxstudio.cloud")
 *   If not set, auto-detects from request URL
 *
 * OPTIONAL (with defaults):
 * - IMAGE_FORMAT: "auto", "webp", or "avif" (default: "auto")
 * - IMAGE_QUALITY: 1-100 (default: 85)
 * - OG_IMAGE_FORMAT: "jpeg", "png", or "webp" (default: "jpeg")
 *   Note: OG/Twitter images default to JPEG for better social media compatibility
 * - OG_IMAGE_QUALITY: 1-100 (default: 80)
 *   Note: Separate quality setting for OG/Twitter images
 * - EDGE_CACHE_TTL: Edge cache TTL in seconds (default: 31536000 = 1 year)
 * - BROWSER_CACHE_TTL: Browser cache TTL in seconds (default: 604800 = 1 week)
 * - CATCH_ALL_EXTERNAL: "true" or "false" (default: "false")
 *
 * PREREQUISITES:
 *
 * 1. REQUIRED: Enable Image Transformations
 *    - Go to Cloudflare Dashboard → Your Zone → Images → Transformations
 *    - Enable Image Transformations
 *
 * 2. REQUIRED: Add Allowed Origins
 *    - Go to Images → Transformations → Sources
 *    - Add these origins:
 *      * cdn.prod.website-files.com
 *      * assets.website-files.com
 *      * assets-global.website-files.com
 *      * uploads-ssl.webflow.com
 *      * YOUR_DOMAIN (e.g., www.bxstudio.cloud) ← Required for image transformation
 *    - Or use *.website-files.com wildcard if available
 *
 * 3. REQUIRED: Deploy Worker on Custom Domain
 *    - Deploy this Worker on a custom domain route (not *.workers.dev)
 *    - Set route to match your site: e.g., *bxstudio.cloud/*
 *
 * 4. CACHING NOTE:
 *    - This script uses Cloudflare edge caching (fast, global distribution)
 *    - Cache Reserve is NOT available when using O2O (Origin-to-Origin) proxying
 *    - Webflow uses O2O, so Cache Reserve is bypassed (Cloudflare limitation)
 *    - All assets cache at Cloudflare edge, providing excellent performance
 *
 * HOW IT WORKS:
 *
 * Request Flow:
 * 1. User requests HTML → Worker fetches and caches HTML
 * 2. Worker rewrites image URLs:
 *    - AVIF: https://yourdomain.com/img-cache/https://assets.website-files.com/image.avif
 *    - Others: https://yourdomain.com/cdn-cgi/image/format=auto,quality=85/https://yourdomain.com/img-original/https://assets.website-files.com/image.jpg
 * 3. Browser requests images:
 *    - /img-cache/ → Worker proxies AVIF (cached at edge)
 *    - /img-original/ → Worker proxies original (cached at edge)
 *    - /cdn-cgi/image/ → Cloudflare fetches from /img-original/, transforms, caches
 *
 * Caching:
 * - HTML responses: Cached at Cloudflare edge
 * - Original images (/img-original/): Cached at Cloudflare edge
 * - Transformed images (/cdn-cgi/image/): Cached at edge via Image Resizing
 * - AVIF images (/img-cache/): Cached at Cloudflare edge
 * - Proxied assets (/asset-cache/): Cached at Cloudflare edge
 *
 * All assets use Cloudflare edge caching with 1-year TTL for optimal performance.
 * Cache Reserve is not available with O2O proxying (Webflow uses O2O).
 */

// ============================================
// TYPES
// ============================================

interface Env {
	DOMAIN?: string;
	SITE_ID?: string;
	IMAGE_FORMAT?: string;
	IMAGE_QUALITY?: string;
	OG_IMAGE_FORMAT?: string;
	OG_IMAGE_QUALITY?: string;
	EDGE_CACHE_TTL?: string;
	BROWSER_CACHE_TTL?: string;
	CATCH_ALL_EXTERNAL?: string;
	PURIFIED_CSS_ENABLED?: string;
	MINIFIED_CSS_LINK?: string; // URL to purified/minified CSS file
	PROGRESSIVE_SECTIONS_ENABLED?: string;
	OPTIMISE_LANDING_PAGE_ONLY?: string;
	DISPATCH_EVENT?: 'BOT' | 'DOM_LOADED' | 'BOTH';
}

interface Config {
	DOMAIN: string;
	SITE_ID: string | null;
	IMAGE_FORMAT: string;
	IMAGE_QUALITY: number;
	OG_IMAGE_FORMAT: string;
	OG_IMAGE_QUALITY: number;
	EDGE_CACHE_TTL: number;
	BROWSER_CACHE_TTL: number;
	CATCH_ALL_EXTERNAL: boolean;
	PURIFIED_CSS_ENABLED: boolean;
	MINIFIED_CSS_LINK: string | null;
	PROGRESSIVE_SECTIONS_ENABLED: boolean;
	OPTIMISE_LANDING_PAGE_ONLY: boolean;
	DISPATCH_EVENT: string;
}

interface DomainInfo {
	original: string;
	baseDomain: string;
	withWww: string;
	withoutWww: string;
}

interface ExtractedSection {
	id: string;
	html: string;
}

// ============================================
// DEFAULT CONFIGURATION (Fallback if env vars not set)
// ============================================

const DEFAULT_CONFIG = {
	// Image transformation settings
	IMAGE_FORMAT: 'auto', // 'auto' = serve AVIF to browsers that support it, WebP to others
	IMAGE_QUALITY: 85, // 1-100 (85 is good balance of quality vs file size)

	// OG/Twitter image settings (separate from regular images)
	OG_IMAGE_FORMAT: 'jpeg', // 'jpeg', 'png', 'webp' (default: 'jpeg' for better OG compatibility)
	OG_IMAGE_QUALITY: 80, // 1-100 (default: 80 for good balance)

	// Cache settings (in seconds)
	EDGE_CACHE_TTL: 31536000, // 1 year (for Cloudflare's edge cache)
	BROWSER_CACHE_TTL: 604800, // 1 week (for browser cache)

	// Process images from any external domain (not just Webflow CDN)
	CATCH_ALL_EXTERNAL: false, // Set to true to process all external images

	// Optimize landing page only (other paths fetch from Webflow directly)
	OPTIMISE_LANDING_PAGE_ONLY: false, // Set to true to apply optimization only to the landing page
};

// Webflow CDN origins (always processed)
const WEBFLOW_ORIGINS = [
	'assets.website-files.com',
	'assets-global.website-files.com',
	'cdn.prod.website-files.com',
	'uploads-ssl.webflow.com',
];

// Extensions that can be transformed via Cloudflare Image Resizing
const TRANSFORMABLE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];

// Extensions that should be proxied only (no transformation)
const PASSTHROUGH_EXTENSIONS = ['avif'];

// Asset file extensions to proxy (CSS, JS, fonts, icons)
const ASSET_EXTENSIONS = ['css', 'js', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'ico'];

// Domains to never process (analytics, tracking pixels, etc.)
const EXCLUDED_DOMAINS = [
	'www.google-analytics.com',
	'www.googletagmanager.com',
	'www.google.com',
	'connect.facebook.net',
	'www.facebook.com',
	'px.ads.linkedin.com',
	'googleads.g.doubleclick.net',
	'www.gstatic.com',
	'fonts.googleapis.com',
	'fonts.gstatic.com',
];

// Bot user agents (for serving full HTML to crawlers)
const BOT_USER_AGENTS = [
	'googlebot',
	'bingbot',
	'slurp', // Yahoo
	'duckduckbot',
	'baiduspider',
	'yandexbot',
	'sogou',
	'exabot',
	'facebot',
	'facebookexternalhit',
	'twitterbot',
	'rogerbot',
	'linkedinbot',
	'embedly',
	'quora link preview',
	'showyoubot',
	'outbrain',
	'pinterest',
	'slackbot',
	'vkshare',
	'w3c_validator',
	'whatsapp',
	'redditbot',
	'applebot',
	'flipboard',
	'tumblr',
	'bitlybot',
	'skypeuripreview',
	'nuzzel',
	'discordbot',
	'qwantify',
	'pinterestbot',
	'bitrix',
	'lighthouse', // Google Lighthouse
	'chrome-lighthouse',
	'gtmetrix',
	'pingdom',
	'headlesschrome',
	'phantomjs',
];

// ============================================
// WORKER ENTRY POINT
// ============================================

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return handleRequest(request, env, ctx);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		return handleScheduled(event, env, ctx);
	},
};

// ============================================
// MAIN REQUEST HANDLER
// ============================================

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	try {
		// Get configuration from environment variables with defaults
		const config = getConfig(env, request);

		// Validate configuration
		validateConfig(config);

		// Parse request URL (with error handling)
		let url: URL;
		try {
			url = new URL(request.url);
		} catch (urlError) {
			// Invalid request URL - pass through to origin
			console.error('Invalid request URL:', request.url, (urlError as Error).message);
			return fetch(request);
		}

		// Handle CORS preflight for proxy endpoints
		if (
			request.method === 'OPTIONS' &&
			(url.pathname.startsWith('/img-cache/') || url.pathname.startsWith('/img-original/') || url.pathname.startsWith('/asset-cache/'))
		) {
			return handleCorsPreflight();
		}

		// Handle AVIF proxy requests
		if (url.pathname.startsWith('/img-cache/')) {
			return handleAvifProxy(url, config, ctx);
		}

		// Handle original image proxy requests (cached at edge)
		if (url.pathname.startsWith('/img-original/')) {
			return handleOriginalImageProxy(url, config, ctx);
		}

		// Handle asset proxy requests (CSS, JS, fonts, icons)
		if (url.pathname.startsWith('/asset-cache/')) {
			return handleAssetProxy(request, url, config, ctx);
		}

		// Handle section requests for progressive loading
		if (url.pathname.startsWith('/section/')) {
			return handleSectionRequest(url, config, ctx);
		}

		// Fetch the original response from origin with caching enabled
		// When progressive sections are enabled, don't cache the main HTML (only cache sections)
		// Otherwise, use cf.cacheEverything to leverage Cloudflare's edge cache
		const response = await fetch(request, {
			cf: config.PROGRESSIVE_SECTIONS_ENABLED
				? {
						// No caching for main HTML when sections are extracted
						cacheTtl: 0,
						cacheEverything: false,
					}
				: {
						// Normal caching when progressive sections disabled
						cacheEverything: true,
						cacheTtl: config.EDGE_CACHE_TTL,
					},
		});

		// Only transform HTML responses
		const contentType = response.headers.get('Content-Type') || '';
		if (!contentType.includes('text/html')) {
			return response;
		}

		// Only apply treatment to the landing page if enabled; other paths fetch from Webflow directly
		if (config.OPTIMISE_LANDING_PAGE_ONLY) {
			const { pathname } = url;
			const isLandingPage = pathname === '/' || pathname === '' || pathname === '/index.html';
			if (!isLandingPage) {
				return response;
			}
		}

		// Transform image and asset URLs in HTML
		return transformHtmlResponse(response, config, ctx, request);
	} catch (error) {
		// On any error, fail open - return original request
		console.error('Worker error:', (error as Error).message, (error as Error).stack);
		return fetch(request);
	}
}

// ============================================
// CONFIGURATION MANAGEMENT
// ============================================

/**
 * Get configuration from environment variables with fallback to defaults
 */
function getConfig(env: Env, request: Request): Config {
	// Parse request URL (with error handling)
	let url: URL;
	try {
		url = new URL(request.url);
	} catch (error) {
		console.error(error);
		// If URL is invalid, try to get domain from env var only
		if (!env.DOMAIN) {
			throw new Error('DOMAIN must be set via environment variable (request URL is invalid)');
		}
		// Return config with env.DOMAIN and defaults
		const imageQuality = parseInt(env.IMAGE_QUALITY || String(DEFAULT_CONFIG.IMAGE_QUALITY), 10);
		const edgeCacheTtl = parseInt(env.EDGE_CACHE_TTL || String(DEFAULT_CONFIG.EDGE_CACHE_TTL), 10);
		const browserCacheTtl = parseInt(env.BROWSER_CACHE_TTL || String(DEFAULT_CONFIG.BROWSER_CACHE_TTL), 10);
		const catchAllExternal = env.CATCH_ALL_EXTERNAL === 'true' || DEFAULT_CONFIG.CATCH_ALL_EXTERNAL;
		const imageFormat = env.IMAGE_FORMAT || DEFAULT_CONFIG.IMAGE_FORMAT;
		const validFormats = ['auto', 'webp', 'avif'];
		const finalImageFormat = validFormats.includes(imageFormat) ? imageFormat : DEFAULT_CONFIG.IMAGE_FORMAT;
		const ogImageQuality = parseInt(env.OG_IMAGE_QUALITY || String(DEFAULT_CONFIG.OG_IMAGE_QUALITY), 10);
		const ogImageFormat = (env.OG_IMAGE_FORMAT || DEFAULT_CONFIG.OG_IMAGE_FORMAT).toLowerCase();
		const validOgFormats = ['jpeg', 'jpg', 'png', 'webp'];
		const finalOgImageFormat = validOgFormats.includes(ogImageFormat)
			? ogImageFormat === 'jpg'
				? 'jpeg'
				: ogImageFormat
			: DEFAULT_CONFIG.OG_IMAGE_FORMAT;
		return {
			DOMAIN: env.DOMAIN,
			SITE_ID: env.SITE_ID || null,
			IMAGE_FORMAT: finalImageFormat,
			IMAGE_QUALITY: imageQuality,
			OG_IMAGE_FORMAT: finalOgImageFormat,
			OG_IMAGE_QUALITY: ogImageQuality,
			EDGE_CACHE_TTL: edgeCacheTtl,
			BROWSER_CACHE_TTL: browserCacheTtl,
			CATCH_ALL_EXTERNAL: catchAllExternal,
			PURIFIED_CSS_ENABLED: env.PURIFIED_CSS_ENABLED === 'true',
			MINIFIED_CSS_LINK: env.MINIFIED_CSS_LINK || null,
			PROGRESSIVE_SECTIONS_ENABLED: env.PROGRESSIVE_SECTIONS_ENABLED === 'true',
			OPTIMISE_LANDING_PAGE_ONLY: env.OPTIMISE_LANDING_PAGE_ONLY === 'true' || DEFAULT_CONFIG.OPTIMISE_LANDING_PAGE_ONLY,
			DISPATCH_EVENT: env.DISPATCH_EVENT || 'BOTH',
		};
	}

	// Get domain from env var, or auto-detect from request
	const domain = env.DOMAIN || url.hostname;

	if (!domain) {
		throw new Error('DOMAIN must be set via environment variable or detected from request');
	}

	// Parse environment variables with validation and defaults
	// parseInt() with radix 10 for integer parsing
	const imageQuality = parseInt(env.IMAGE_QUALITY || String(DEFAULT_CONFIG.IMAGE_QUALITY), 10);
	const edgeCacheTtl = parseInt(env.EDGE_CACHE_TTL || String(DEFAULT_CONFIG.EDGE_CACHE_TTL), 10);
	const browserCacheTtl = parseInt(env.BROWSER_CACHE_TTL || String(DEFAULT_CONFIG.BROWSER_CACHE_TTL), 10);
	const catchAllExternal = env.CATCH_ALL_EXTERNAL === 'true' || DEFAULT_CONFIG.CATCH_ALL_EXTERNAL;

	// Validate image format
	const imageFormat = env.IMAGE_FORMAT || DEFAULT_CONFIG.IMAGE_FORMAT;
	const validFormats = ['auto', 'webp', 'avif'];
	const finalImageFormat = validFormats.includes(imageFormat) ? imageFormat : DEFAULT_CONFIG.IMAGE_FORMAT;

	// Parse OG image settings
	const ogImageQuality = parseInt(env.OG_IMAGE_QUALITY || String(DEFAULT_CONFIG.OG_IMAGE_QUALITY), 10);
	const ogImageFormat = (env.OG_IMAGE_FORMAT || DEFAULT_CONFIG.OG_IMAGE_FORMAT).toLowerCase();
	const validOgFormats = ['jpeg', 'jpg', 'png', 'webp'];
	// Normalize 'jpg' to 'jpeg' (Cloudflare uses 'jpeg' in format parameter)
	const finalOgImageFormat = validOgFormats.includes(ogImageFormat)
		? ogImageFormat === 'jpg'
			? 'jpeg'
			: ogImageFormat
		: DEFAULT_CONFIG.OG_IMAGE_FORMAT;

	return {
		DOMAIN: domain,
		SITE_ID: env.SITE_ID || null,
		IMAGE_FORMAT: finalImageFormat,
		IMAGE_QUALITY: imageQuality,
		OG_IMAGE_FORMAT: finalOgImageFormat,
		OG_IMAGE_QUALITY: ogImageQuality,
		EDGE_CACHE_TTL: edgeCacheTtl,
		BROWSER_CACHE_TTL: browserCacheTtl,
		CATCH_ALL_EXTERNAL: catchAllExternal,
		PURIFIED_CSS_ENABLED: env.PURIFIED_CSS_ENABLED === 'true',
		MINIFIED_CSS_LINK: env.MINIFIED_CSS_LINK || null,
		PROGRESSIVE_SECTIONS_ENABLED: env.PROGRESSIVE_SECTIONS_ENABLED === 'true',
		OPTIMISE_LANDING_PAGE_ONLY: env.OPTIMISE_LANDING_PAGE_ONLY === 'true' || DEFAULT_CONFIG.OPTIMISE_LANDING_PAGE_ONLY,
		DISPATCH_EVENT: env.DISPATCH_EVENT || 'BOTH',
	};
}

/**
 * Validate configuration values
 */
function validateConfig(config: Config): void {
	// Validate image quality (check for NaN first)
	if (isNaN(config.IMAGE_QUALITY) || config.IMAGE_QUALITY < 1 || config.IMAGE_QUALITY > 100) {
		console.error(`Invalid IMAGE_QUALITY: ${config.IMAGE_QUALITY}, using default: ${DEFAULT_CONFIG.IMAGE_QUALITY}`);
		config.IMAGE_QUALITY = DEFAULT_CONFIG.IMAGE_QUALITY;
	}

	// Validate cache TTLs (check for NaN first)
	if (isNaN(config.EDGE_CACHE_TTL) || config.EDGE_CACHE_TTL < 0) {
		console.error(`Invalid EDGE_CACHE_TTL: ${config.EDGE_CACHE_TTL}, using default: ${DEFAULT_CONFIG.EDGE_CACHE_TTL}`);
		config.EDGE_CACHE_TTL = DEFAULT_CONFIG.EDGE_CACHE_TTL;
	}

	if (isNaN(config.BROWSER_CACHE_TTL) || config.BROWSER_CACHE_TTL < 0) {
		console.error(`Invalid BROWSER_CACHE_TTL: ${config.BROWSER_CACHE_TTL}, using default: ${DEFAULT_CONFIG.BROWSER_CACHE_TTL}`);
		config.BROWSER_CACHE_TTL = DEFAULT_CONFIG.BROWSER_CACHE_TTL;
	}

	// Validate OG image quality (check for NaN first)
	if (isNaN(config.OG_IMAGE_QUALITY) || config.OG_IMAGE_QUALITY < 1 || config.OG_IMAGE_QUALITY > 100) {
		console.error(`Invalid OG_IMAGE_QUALITY: ${config.OG_IMAGE_QUALITY}, using default: ${DEFAULT_CONFIG.OG_IMAGE_QUALITY}`);
		config.OG_IMAGE_QUALITY = DEFAULT_CONFIG.OG_IMAGE_QUALITY;
	}

	// Validate domain
	if (!config.DOMAIN || typeof config.DOMAIN !== 'string' || config.DOMAIN.trim() === '') {
		throw new Error('DOMAIN is required and must be a non-empty string');
	}

	// Validate domain format (basic check)
	if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(config.DOMAIN)) {
		console.error(`DOMAIN format may be invalid: ${config.DOMAIN}`);
	}
}

// ============================================
// HTML TRANSFORMATION
// ============================================

/**
 * Transform HTML response to rewrite image and asset URLs
 */
async function transformHtmlResponse(response: Response, config: Config, ctx: ExecutionContext, request: Request): Promise<Response> {
	// Clone response before reading (body can only be read once)
	const responseClone = response.clone();

	let html: string;
	try {
		html = await response.text();
	} catch (textError) {
		// If we can't read the response body, return cloned original response
		console.error('Failed to read response text:', (textError as Error).message);
		return responseClone;
	}

	// Check if request is from a bot
	const isBot = isBotRequest(request);

	// Quick check - any Webflow CDN assets worth processing?
	if (!hasWebflowAssets(html, config)) {
		return createResponse(html, response);
	}

	// Build domain info for self-reference checks
	const domainInfo = buildDomainInfo(config.DOMAIN);

	// Get site ID from config (env var) or extract from HTML as fallback
	let siteId = config.SITE_ID;
	if (!siteId) {
		const siteIdMatch = html.match(/data-wf-site=["']([a-f0-9]+)["']/);
		siteId = siteIdMatch ? siteIdMatch[1] : null;
	}

	// Transform all image URLs
	html = transformAllImageUrls(html, config, domainInfo);

	// Transform all asset URLs (CSS, JS, fonts, icons)
	html = transformAllAssetUrls(html, config, domainInfo, siteId);

	// Progressive section loading (if enabled and not a bot)
	// Bots get full HTML for proper SEO indexing
	if (config.PROGRESSIVE_SECTIONS_ENABLED && !isBot) {
		try {
			const { html: modifiedHtml, sections } = await extractAndCacheSections(html, config, ctx, response.url);
			html = modifiedHtml;

			// Inject loader script if sections were extracted
			if (sections.length > 0) {
				const sectionIds = sections.map((s) => s.id);
				html = injectSectionLoaderScript(html, sectionIds, config);
			}
		} catch (sectionError) {
			console.error('Section extraction error:', (sectionError as Error).message);
			// Continue with unmodified HTML on error
		}
	}

	return createResponse(html, response);
}

/**
 * Quick check if HTML contains Webflow CDN assets worth processing
 * Optimized with early exit for better performance
 */
function hasWebflowAssets(html: string, config: Config): boolean {
	// Early exit: if HTML is very small, unlikely to have assets
	if (html.length < 100) {
		return false;
	}

	// Check for Webflow CDN domains (most common case)
	for (const origin of WEBFLOW_ORIGINS) {
		if (html.includes(origin)) {
			return true;
		}
	}

	// In catch-all mode, check for any external asset URLs
	if (config.CATCH_ALL_EXTERNAL) {
		return /https?:\/\/[^"'\s<>]+\.(?:png|jpe?g|webp|gif|svg|avif|css|js|woff2?|ttf|otf|eot|ico)(?:[?#"'\s<>]|$)/i.test(html);
	}

	return false;
}

/**
 * Build domain info object for URL comparison
 */
function buildDomainInfo(domain: string): DomainInfo {
	const lower = domain.toLowerCase().trim();

	// Handle edge case: domain is just "www" or empty
	if (!lower || lower === 'www' || lower === 'www.') {
		throw new Error('Invalid domain: domain cannot be just "www"');
	}

	const baseDomain = lower.replace(/^www\./, '');

	// Ensure baseDomain is not empty
	if (!baseDomain) {
		throw new Error('Invalid domain: base domain cannot be empty');
	}

	return {
		original: lower,
		baseDomain: baseDomain,
		withWww: 'www.' + baseDomain,
		withoutWww: baseDomain,
	};
}

/**
 * Check if hostname belongs to our own domain (including subdomains)
 */
function isOwnDomain(hostname: string, domainInfo: DomainInfo): boolean {
	const lower = hostname.toLowerCase();

	// Exact matches
	if (lower === domainInfo.original || lower === domainInfo.withWww || lower === domainInfo.withoutWww) {
		return true;
	}

	// Subdomain check (e.g., cdn.example.com for example.com)
	if (lower.endsWith('.' + domainInfo.baseDomain)) {
		return true;
	}

	return false;
}

/**
 * Check if request is from a bot/crawler
 */
function isBotRequest(request: Request): boolean {
	const userAgent = request.headers.get('User-Agent');
	if (!userAgent) {
		return false;
	}

	const lowerUA = userAgent.toLowerCase();
	return BOT_USER_AGENTS.some((botAgent) => lowerUA.includes(botAgent));
}

/**
 * Check if hostname is in the exclusion list
 */
function isExcludedDomain(hostname: string): boolean {
	const lower = hostname.toLowerCase();
	return EXCLUDED_DOMAINS.some((excluded) => lower === excluded || lower.endsWith('.' + excluded));
}

/**
 * Transform all image URLs in HTML
 */
function transformAllImageUrls(html: string, config: Config, domainInfo: DomainInfo): string {
	// 1. Transform src and data-src attributes
	html = transformSrcAttributes(html, config, domainInfo);

	// 2. Transform srcset and data-srcset attributes
	html = transformSrcsetAttributes(html, config, domainInfo);

	// 3. Transform inline style attributes
	html = transformInlineStyles(html, config, domainInfo);

	// 4. Transform <style> blocks
	html = transformStyleBlocks(html, config, domainInfo);

	return html;
}

/**
 * Transform src and data-src attributes on img and source elements
 */
function transformSrcAttributes(html: string, config: Config, domainInfo: DomainInfo): string {
	return html.replace(/(<(?:img|source)\b[^>]*\s)((?:data-)?src\s*=\s*)(["'])([^"']*)\3/gi, (match, tagStart, attrName, quote, url) => {
		const transformed = transformSingleUrl(url, config, domainInfo);
		return tagStart + attrName + quote + transformed + quote;
	});
}

/**
 * Transform srcset and data-srcset attributes
 */
function transformSrcsetAttributes(html: string, config: Config, domainInfo: DomainInfo): string {
	return html.replace(
		/(<(?:img|source)\b[^>]*\s)((?:data-)?srcset\s*=\s*)(["'])([^"']*)\3/gi,
		(match, tagStart, attrName, quote, srcsetValue) => {
			const transformed = transformSrcsetValue(srcsetValue, config, domainInfo);
			return tagStart + attrName + quote + transformed + quote;
		},
	);
}

/**
 * Transform a srcset attribute value (comma-separated URLs with descriptors)
 */
function transformSrcsetValue(srcset: string, config: Config, domainInfo: DomainInfo): string {
	return srcset
		.split(',')
		.map((entry) => {
			const trimmed = entry.trim();
			if (!trimmed) return '';

			// Match URL and optional descriptor (e.g., "2x" or "800w")
			const match = trimmed.match(/^(.+?)\s+([\d.]+[wx])$/i);

			if (match) {
				const url = match[1].trim();
				const descriptor = match[2];
				return transformSingleUrl(url, config, domainInfo) + ' ' + descriptor;
			}

			// No descriptor - just transform the URL
			return transformSingleUrl(trimmed, config, domainInfo);
		})
		.filter(Boolean)
		.join(', ');
}

/**
 * Transform inline style attributes
 */
function transformInlineStyles(html: string, config: Config, domainInfo: DomainInfo): string {
	return html.replace(/(\bstyle\s*=\s*)(["'])([^"']*)\2/gi, (match, styleAttr, quote, styleContent) => {
		const transformed = transformCssUrls(styleContent, config, domainInfo);
		return styleAttr + quote + transformed + quote;
	});
}

/**
 * Transform <style> blocks
 */
function transformStyleBlocks(html: string, config: Config, domainInfo: DomainInfo): string {
	return html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (match, openTag, cssContent, closeTag) => {
		const transformed = transformCssUrls(cssContent, config, domainInfo);
		return openTag + transformed + closeTag;
	});
}

/**
 * Transform url() values in CSS content, preserving original quote style
 */
function transformCssUrls(css: string, config: Config, domainInfo: DomainInfo): string {
	return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (match, quote, url) => {
		const transformed = transformSingleUrl(url, config, domainInfo);
		// Preserve original quote style (empty string if no quotes)
		return 'url(' + quote + transformed + quote + ')';
	});
}

/**
 * Transform a single URL to use Cloudflare optimization or proxy
 */
function transformSingleUrl(url: string, config: Config, domainInfo: DomainInfo): string {
	// Skip empty or whitespace-only
	if (!url || !url.trim()) {
		return url;
	}

	// Skip data: and blob: URLs
	if (url.startsWith('data:') || url.startsWith('blob:')) {
		return url;
	}

	// Skip non-HTTP URLs (relative paths, etc.)
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		return url;
	}

	// Skip already-transformed URLs (prevent double processing)
	if (url.includes('/cdn-cgi/image/') || url.includes('/img-cache/') || url.includes('/img-original/') || url.includes('/asset-cache/')) {
		return url;
	}

	// Parse the URL
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		// Invalid URL - return as-is
		return url;
	}

	const hostname = parsed.hostname.toLowerCase();

	// Skip our own domain (including subdomains)
	if (isOwnDomain(hostname, domainInfo)) {
		return url;
	}

	// Skip excluded domains (analytics, tracking, etc.)
	if (isExcludedDomain(hostname)) {
		return url;
	}

	// Check if from Webflow CDN
	const isWebflowOrigin = WEBFLOW_ORIGINS.some((origin) => hostname === origin || hostname.endsWith('.' + origin));

	// Skip if not Webflow origin and not in catch-all mode
	if (!isWebflowOrigin && !config.CATCH_ALL_EXTERNAL) {
		return url;
	}

	// Get file extension
	const ext = getExtension(parsed.pathname);
	if (!ext) {
		return url;
	}

	// AVIF: Proxy only (already optimal format, can't efficiently re-encode)
	if (PASSTHROUGH_EXTENSIONS.includes(ext)) {
		// Encode the full URL for the proxy path (with double-encoding protection)
		const encodedUrl = safeEncodeUrl(url);
		return 'https://' + config.DOMAIN + '/img-cache/' + encodedUrl;
	}

	// Transformable images: Proxy original first, then transform
	if (TRANSFORMABLE_EXTENSIONS.includes(ext)) {
		// First proxy original through /img-original/ for edge caching
		// Note: SVG files are sanitized by Cloudflare but not resized (inherently scalable)
		const encodedOriginalUrl = safeEncodeUrl(url);
		const originalProxyUrl = 'https://' + config.DOMAIN + '/img-original/' + encodedOriginalUrl;

		// Build transform URL
		// For SVGs, quality parameter is ignored by Cloudflare, so we skip it for optimization
		const isSvg = ext === 'svg';
		const quality = isNaN(config.IMAGE_QUALITY) ? DEFAULT_CONFIG.IMAGE_QUALITY : config.IMAGE_QUALITY;
		const transformParams = isSvg ? 'format=' + config.IMAGE_FORMAT : 'format=' + config.IMAGE_FORMAT + ',quality=' + quality;

		return 'https://' + config.DOMAIN + '/cdn-cgi/image/' + transformParams + '/' + originalProxyUrl;
	}

	// Unknown extension - return unchanged
	return url;
}

/**
 * Transform all asset URLs in HTML (CSS, JS, fonts, icons)
 */
function transformAllAssetUrls(html: string, config: Config, domainInfo: DomainInfo, siteId: string | null): string {
	// 1. Transform <link> tags (CSS, favicons)
	html = transformLinkTags(html, config, domainInfo, siteId);

	// 2. Transform <script> tags (JavaScript)
	html = transformScriptTags(html, config, domainInfo, siteId);

	// 3. Transform <meta> tags (OG images, Twitter images)
	html = transformMetaTags(html, config, domainInfo);

	return html;
}

/**
 * Transform <link> tags (CSS, favicons, etc.)
 */
function transformLinkTags(html: string, config: Config, domainInfo: DomainInfo, siteId: string | null): string {
	return html.replace(/(<link\b[^>]*\s)(href\s*=\s*)(["'])([^"']*)\3/gi, (match, tagStart, attrName, quote, url) => {
		// Check if this is a favicon or apple-touch-icon (treat as image)
		const isFavicon = /rel\s*=\s*["']?(?:shortcut\s+)?icon|apple-touch-icon/gi.test(match);

		if (isFavicon) {
			// Transform as image (not asset) for favicons
			const transformed = transformSingleUrl(url, config, domainInfo);
			return tagStart + attrName + quote + transformed + quote;
		}
		// Transform as asset for CSS, etc.
		const transformed = transformAssetUrl(url, config, domainInfo, siteId);
		return tagStart + attrName + quote + transformed + quote;
	});
}

/**
 * Transform <script> tags (JavaScript)
 */
function transformScriptTags(html: string, config: Config, domainInfo: DomainInfo, siteId: string | null): string {
	return html.replace(/(<script\b[^>]*\s)(src\s*=\s*)(["'])([^"']*)\3/gi, (match, tagStart, attrName, quote, url) => {
		const transformed = transformAssetUrl(url, config, domainInfo, siteId);
		return tagStart + attrName + quote + transformed + quote;
	});
}

/**
 * Transform <meta> tags (OG images, Twitter images)
 * Uses OG-specific format and quality settings (defaults to JPEG for better compatibility)
 */
function transformMetaTags(html: string, config: Config, domainInfo: DomainInfo): string {
	return html.replace(/(<meta\b[^>]*\s)(content\s*=\s*)(["'])([^"']*)\3/gi, (match, tagStart, attrName, quote, url) => {
		// Check if this is an image meta tag (og:image, twitter:image)
		const isImageMeta = /(?:property|name)\s*=\s*["']?(?:og:image|twitter:image)/gi.test(match);

		if (!isImageMeta) return match;

		// Transform as OG image (uses OG-specific format and quality)
		const transformed = transformOgImageUrl(url, config, domainInfo);
		return tagStart + attrName + quote + transformed + quote;
	});
}

/**
 * Transform OG/Twitter image URL with OG-specific settings
 * Defaults to JPEG format for better social media compatibility
 */
function transformOgImageUrl(url: string, config: Config, domainInfo: DomainInfo): string {
	// Skip empty or whitespace-only
	if (!url || !url.trim()) {
		return url;
	}

	// Skip data: and blob: URLs
	if (url.startsWith('data:') || url.startsWith('blob:')) {
		return url;
	}

	// Skip non-HTTP URLs (relative paths, etc.)
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		return url;
	}

	// Skip already-transformed URLs (prevent double processing)
	if (url.includes('/cdn-cgi/image/') || url.includes('/img-cache/') || url.includes('/img-original/') || url.includes('/asset-cache/')) {
		return url;
	}

	// Parse the URL
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		// Invalid URL - return as-is
		return url;
	}

	const hostname = parsed.hostname.toLowerCase();

	// Skip our own domain (including subdomains)
	if (isOwnDomain(hostname, domainInfo)) {
		return url;
	}

	// Skip excluded domains (analytics, tracking, etc.)
	if (isExcludedDomain(hostname)) {
		return url;
	}

	// Check if from Webflow CDN
	const isWebflowOrigin = WEBFLOW_ORIGINS.some((origin) => hostname === origin || hostname.endsWith('.' + origin));

	// Skip if not Webflow origin and not in catch-all mode
	if (!isWebflowOrigin && !config.CATCH_ALL_EXTERNAL) {
		return url;
	}

	// Get file extension
	const ext = getExtension(parsed.pathname);
	if (!ext) {
		return url;
	}

	// AVIF: Convert to OG format (AVIF not well supported for OG images)
	if (PASSTHROUGH_EXTENSIONS.includes(ext)) {
		// Proxy original first, then transform to OG format
		const encodedOriginalUrl = safeEncodeUrl(url);
		const originalProxyUrl = 'https://' + config.DOMAIN + '/img-original/' + encodedOriginalUrl;

		// Use OG-specific format and quality
		const ogFormat = config.OG_IMAGE_FORMAT || DEFAULT_CONFIG.OG_IMAGE_FORMAT;
		const ogQuality = isNaN(config.OG_IMAGE_QUALITY) ? DEFAULT_CONFIG.OG_IMAGE_QUALITY : config.OG_IMAGE_QUALITY;

		return 'https://' + config.DOMAIN + '/cdn-cgi/image/format=' + ogFormat + ',quality=' + ogQuality + '/' + originalProxyUrl;
	}

	// Transformable images: Proxy original first, then transform with OG settings
	if (TRANSFORMABLE_EXTENSIONS.includes(ext)) {
		// First proxy original through /img-original/ for edge caching
		const encodedOriginalUrl = safeEncodeUrl(url);
		const originalProxyUrl = 'https://' + config.DOMAIN + '/img-original/' + encodedOriginalUrl;

		// Use OG-specific format and quality (not regular image settings)
		const ogFormat = config.OG_IMAGE_FORMAT || DEFAULT_CONFIG.OG_IMAGE_FORMAT;
		const ogQuality = isNaN(config.OG_IMAGE_QUALITY) ? DEFAULT_CONFIG.OG_IMAGE_QUALITY : config.OG_IMAGE_QUALITY;

		// For SVGs, format conversion may not work, but we'll try
		const isSvg = ext === 'svg';
		const transformParams = isSvg ? 'format=' + ogFormat : 'format=' + ogFormat + ',quality=' + ogQuality;

		return 'https://' + config.DOMAIN + '/cdn-cgi/image/' + transformParams + '/' + originalProxyUrl;
	}

	// Unknown extension - return unchanged
	return url;
}

/**
 * Transform a single asset URL to use proxy
 */
function transformAssetUrl(url: string, config: Config, domainInfo: DomainInfo, siteId: string | null): string {
	// Skip empty or whitespace-only
	if (!url || !url.trim()) {
		return url;
	}

	// Skip data: and blob: URLs
	if (url.startsWith('data:') || url.startsWith('blob:')) {
		return url;
	}

	// Handle chunk files (relative URLs with "chunk" in the name)
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		// If it's a chunk file and we have a site ID, construct the full URL
		if (url.includes('chunk') && siteId) {
			// Construct the full Webflow CDN URL
			const fullUrl = `https://cdn.prod.website-files.com/${siteId}/js/${url}`;
			// Encode and return the proxied URL
			const encodedUrl = safeEncodeUrl(fullUrl);
			return 'https://' + config.DOMAIN + '/asset-cache/' + encodedUrl;
		}
		// For other relative URLs, return as-is
		return url;
	}

	// Skip already-proxied URLs (prevent double processing)
	if (url.includes('/asset-cache/') || url.includes('/img-cache/') || url.includes('/img-original/')) {
		return url;
	}

	// Parse the URL
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		// Invalid URL - return as-is
		return url;
	}

	const hostname = parsed.hostname.toLowerCase();

	// Skip our own domain (including subdomains)
	if (isOwnDomain(hostname, domainInfo)) {
		return url;
	}

	// Skip excluded domains (analytics, tracking, etc.)
	if (isExcludedDomain(hostname)) {
		return url;
	}

	// Check if from Webflow CDN
	const isWebflowOrigin = WEBFLOW_ORIGINS.some((origin) => hostname === origin || hostname.endsWith('.' + origin));

	// Skip if not Webflow origin and not in catch-all mode
	if (!isWebflowOrigin && !config.CATCH_ALL_EXTERNAL) {
		return url;
	}

	// Get file extension
	const ext = getExtension(parsed.pathname);
	if (!ext) {
		return url;
	}

	// Check if it's an asset we should proxy
	if (ASSET_EXTENSIONS.includes(ext)) {
		// Encode the full URL for the proxy path (with double-encoding protection)
		const encodedUrl = safeEncodeUrl(url);
		return 'https://' + config.DOMAIN + '/asset-cache/' + encodedUrl;
	}

	// Unknown extension - return unchanged
	return url;
}

/**
 * Validate that content type matches expected type for asset extension
 * Returns true if valid or unknown, false only for obvious mismatches
 */
function validateAssetContentType(contentType: string, ext: string | null): boolean {
	if (!ext) return true;

	// Normalize content type (remove charset, etc.)
	const baseType = contentType.split(';')[0].trim().toLowerCase();

	// Expected content types by extension
	const expectedTypes: Record<string, string[]> = {
		css: ['text/css'],
		js: ['application/javascript', 'text/javascript', 'application/x-javascript'],
		woff: ['font/woff', 'application/font-woff', 'application/octet-stream'],
		woff2: ['font/woff2', 'application/font-woff2', 'application/octet-stream'],
		ttf: ['font/ttf', 'application/font-sfnt', 'application/x-font-ttf', 'application/octet-stream'],
		otf: ['font/otf', 'application/font-sfnt', 'application/x-font-opentype', 'application/octet-stream'],
		eot: ['application/vnd.ms-fontobject', 'application/octet-stream'],
		ico: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/ico'],
	};

	const expected = expectedTypes[ext];
	if (!expected) {
		// Unknown extension - allow any content type
		return true;
	}

	// Check if content type matches any expected type
	return expected.includes(baseType);
}

/**
 * Safely encode URL, avoiding double-encoding
 */
function safeEncodeUrl(url: string): string {
	try {
		// Try decoding first - if it works, it was already encoded
		const decoded = decodeURIComponent(url);
		// If decode worked and result is different, it was encoded
		if (decoded !== url) {
			// Already encoded, decode then re-encode to normalize
			return encodeURIComponent(decoded);
		}
		// Not encoded, encode it
		return encodeURIComponent(url);
	} catch {
		// Decode failed, so it's not encoded - encode it
		return encodeURIComponent(url);
	}
}

/**
 * Extract file extension from URL pathname
 */
function getExtension(pathname: string): string | null {
	// Remove query string and hash
	const cleanPath = pathname.split('?')[0].split('#')[0];

	// Get filename from path
	const filename = cleanPath.split('/').pop();

	// No filename or no extension
	if (!filename || !filename.includes('.')) {
		return null;
	}

	// Get extension (last part after dot)
	const ext = filename.split('.').pop()!.toLowerCase();

	// Validate: 1-5 alphanumeric characters
	if (ext && ext.length >= 1 && ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) {
		return ext;
	}

	return null;
}

/**
 * Create a new Response with transformed HTML
 */
function createResponse(html: string, originalResponse: Response): Response {
	// Create new headers (original might be immutable)
	const headers = new Headers(originalResponse.headers);

	// Ensure correct content type
	headers.set('Content-Type', 'text/html; charset=utf-8');

	return new Response(html, {
		status: originalResponse.status,
		statusText: originalResponse.statusText,
		headers: headers,
	});
}

// ============================================
// AVIF PROXY (Cache & Serve)
// ============================================

/**
 * Proxy and cache AVIF images
 *
 * AVIF images are already optimally compressed, so we don't transform them.
 * Instead, we proxy them through your domain and cache them for fast delivery.
 *
 * This enables:
 * - Caching on your domain (better control)
 * - Edge caching for fast delivery
 * - CORS headers for cross-origin usage
 * - Global distribution via Cloudflare edge
 */
async function handleAvifProxy(url: URL, config: Config, ctx: ExecutionContext): Promise<Response> {
	// Extract the encoded URL from the path
	const encodedUrl = url.pathname.slice('/img-cache/'.length);

	if (!encodedUrl) {
		return errorResponse(400, 'Missing URL parameter');
	}

	// Decode the URL
	let originalUrl: string;
	try {
		originalUrl = decodeURIComponent(encodedUrl);
	} catch {
		return errorResponse(400, 'Invalid URL encoding');
	}

	// Validate URL scheme
	if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
		return errorResponse(400, 'Invalid URL scheme');
	}

	// Security: Validate origin if not in catch-all mode
	if (!config.CATCH_ALL_EXTERNAL) {
		let parsedOrigin: URL;
		try {
			parsedOrigin = new URL(originalUrl);
		} catch {
			return errorResponse(400, 'Invalid URL');
		}

		const hostname = parsedOrigin.hostname.toLowerCase();
		const isAllowed = WEBFLOW_ORIGINS.some((origin) => hostname === origin || hostname.endsWith('.' + origin));

		if (!isAllowed) {
			return errorResponse(403, 'Origin not allowed');
		}
	}

	// Try to get from cache first
	const cacheKey = new Request(url.toString(), { method: 'GET' });
	let cache: Cache | null = null;

	try {
		cache = caches.default;
		const cachedResponse = await cache.match(cacheKey);

		if (cachedResponse) {
			// Return cached response with HIT header
			const headers = new Headers(cachedResponse.headers);
			headers.set('X-Cache', 'HIT');
			return new Response(cachedResponse.body, {
				status: cachedResponse.status,
				headers: headers,
			});
		}
	} catch (e) {
		// Cache API not available (e.g., on workers.dev subdomain)
		console.error('Cache unavailable:', (e as Error).message);
		cache = null;
	}

	// Fetch from origin with caching enabled
	let originResponse: Response;
	try {
		originResponse = await fetch(originalUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker)',
				Accept: 'image/avif,image/webp,image/*,*/*',
			},
			cf: {
				cacheEverything: true,
				cacheTtl: config.EDGE_CACHE_TTL,
			},
		});
	} catch (error) {
		console.error('Origin fetch error:', (error as Error).message);
		return errorResponse(502, 'Failed to fetch from origin');
	}

	// Check origin response status
	if (!originResponse.ok) {
		return errorResponse(originResponse.status, 'Origin returned error: ' + originResponse.status);
	}

	// Verify response is an image
	const contentType = originResponse.headers.get('Content-Type') || '';
	if (!contentType || !contentType.startsWith('image/')) {
		return errorResponse(400, 'Response is not an image (Content-Type: ' + contentType + ')');
	}

	// Build response headers
	const responseHeaders = new Headers();
	responseHeaders.set('Content-Type', contentType);
	responseHeaders.set(
		'Cache-Control',
		'public, s-maxage=' + config.EDGE_CACHE_TTL + ', max-age=' + config.BROWSER_CACHE_TTL + ', immutable',
	);
	responseHeaders.set('Access-Control-Allow-Origin', '*');
	responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
	responseHeaders.set('X-Cache', 'MISS');

	// Preserve content length if available
	const contentLength = originResponse.headers.get('Content-Length');
	if (contentLength) {
		responseHeaders.set('Content-Length', contentLength);
	}

	// Create the proxy response
	const proxyResponse = new Response(originResponse.body, {
		status: 200,
		headers: responseHeaders,
	});

	// Store in cache asynchronously (if cache available)
	if (cache && ctx && ctx.waitUntil) {
		ctx.waitUntil(
			cache.put(cacheKey, proxyResponse.clone()).catch((err) => {
				console.error('Cache put error:', (err as Error).message);
			}),
		);
	}

	return proxyResponse;
}

// ============================================
// ASSET PROXY (CSS, JS, Fonts, Icons)
// ============================================

/**
 * Proxy and cache assets (CSS, JS, fonts, icons)
 *
 * This function proxies Webflow CDN assets through your domain for edge caching.
 *
 * Supported asset types:
 * - CSS files (.css)
 * - JavaScript files (.js)
 * - Font files (.woff, .woff2, .ttf, .otf, .eot)
 * - Icon files (.ico)
 *
 * This enables:
 * - Caching on your domain (better control)
 * - Edge caching for fast delivery
 * - CORS headers for cross-origin usage
 * - Global distribution via Cloudflare edge
 */
async function handleAssetProxy(request: Request, url: URL, config: Config, ctx: ExecutionContext): Promise<Response> {
	// Extract the encoded URL from the path
	const encodedUrl = url.pathname.slice('/asset-cache/'.length);

	if (!encodedUrl) {
		console.error('Asset proxy: Missing URL parameter');
		return errorResponse(400, 'Missing URL parameter');
	}

	// Decode the URL
	let originalUrl: string;
	try {
		originalUrl = decodeURIComponent(encodedUrl);
	} catch (decodeError) {
		console.error('Asset proxy: Invalid URL encoding:', encodedUrl, (decodeError as Error).message);
		return errorResponse(400, 'Invalid URL encoding');
	}

	// Validate URL scheme and handle chunk files
	if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
		// If the filename includes "chunk", construct the proper URL
		if (originalUrl.includes('chunk')) {
			// Use site ID from config, or try to extract from Referer as fallback
			const siteId = config.SITE_ID;

			if (!siteId) {
				return errorResponse(400, 'Invalid URL scheme - chunk file requires SITE_ID environment variable');
			}

			if (siteId) {
				originalUrl = `https://cdn.prod.website-files.com/${siteId}/js/${originalUrl}`;
			} else {
				console.error('Asset proxy: Could not extract site ID from config or Referer for chunk file:', originalUrl);
				return errorResponse(400, 'Invalid URL scheme - chunk file requires SITE_ID environment variable');
			}
		} else {
			console.error('Asset proxy: Invalid URL scheme - received:', originalUrl, 'from encoded:', encodedUrl);
			return errorResponse(400, 'Invalid URL scheme');
		}
	}

	// Security: Validate origin if not in catch-all mode
	if (!config.CATCH_ALL_EXTERNAL) {
		let parsedOrigin: URL;
		try {
			parsedOrigin = new URL(originalUrl);
		} catch {
			return errorResponse(400, 'Invalid URL');
		}

		const hostname = parsedOrigin.hostname.toLowerCase();
		const isAllowed = WEBFLOW_ORIGINS.some((origin) => hostname === origin || hostname.endsWith('.' + origin));

		if (!isAllowed) {
			return errorResponse(403, 'Origin not allowed');
		}
	}

	// Try to get from cache first
	const cacheKey = new Request(url.toString(), { method: 'GET' });
	let cache: Cache | null = null;

	try {
		cache = caches.default;
		const cachedResponse = await cache.match(cacheKey);

		if (cachedResponse) {
			// Return cached response with HIT header
			const headers = new Headers(cachedResponse.headers);
			headers.set('X-Cache', 'HIT');
			return new Response(cachedResponse.body, {
				status: cachedResponse.status,
				headers: headers,
			});
		}
	} catch (e) {
		// Cache API not available (e.g., on workers.dev subdomain)
		console.error('Cache unavailable:', (e as Error).message);
		cache = null;
	}

	// Fetch from origin with caching enabled
	let originResponse: Response;
	try {
		originResponse = await fetch(originalUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker)',
				Accept: '*/*',
			},
			cf: {
				cacheEverything: true,
				cacheTtl: config.EDGE_CACHE_TTL,
			},
		});
	} catch (error) {
		console.error('Origin fetch error:', (error as Error).message);
		return errorResponse(502, 'Failed to fetch from origin');
	}

	// Check origin response status
	if (!originResponse.ok) {
		return errorResponse(originResponse.status, 'Origin returned error: ' + originResponse.status);
	}

	// Get file extension for validation and content-type inference
	// Use string splitting instead of creating new URL object (performance optimization)
	const urlPath = originalUrl.split('?')[0].split('#')[0];
	const ext = getExtension(urlPath);

	// Get content type from origin or infer from extension
	let contentType = originResponse.headers.get('Content-Type') || '';
	if (!contentType) {
		// Infer content type from extension
		if (ext === 'css') contentType = 'text/css; charset=utf-8';
		else if (ext === 'js') contentType = 'application/javascript; charset=utf-8';
		else if (ext === 'woff') contentType = 'font/woff';
		else if (ext === 'woff2') contentType = 'font/woff2';
		else if (ext === 'ttf') contentType = 'font/ttf';
		else if (ext === 'otf') contentType = 'font/otf';
		else if (ext === 'eot') contentType = 'application/vnd.ms-fontobject';
		else if (ext === 'ico') contentType = 'image/x-icon';
		else contentType = 'application/octet-stream';
	} else {
		// Reject HTML responses for binary assets (likely error pages)
		const contentTypeLower = contentType.toLowerCase();
		if (contentTypeLower.includes('text/html') && ext && ['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) {
			return errorResponse(502, 'Origin returned HTML instead of expected asset');
		}

		// Validate content type matches expected type for this extension
		// This is a sanity check to catch misconfigured origins
		const isValid = validateAssetContentType(contentTypeLower, ext);
		if (!isValid) {
			console.error(`Content-Type mismatch: Expected ${ext}, got ${contentType} for ${originalUrl}`);
			// Don't reject - some origins may serve with generic types, but log the warning
		}
	}

	// Build response headers
	const responseHeaders = new Headers();
	responseHeaders.set('Content-Type', contentType);
	responseHeaders.set(
		'Cache-Control',
		'public, s-maxage=' + config.EDGE_CACHE_TTL + ', max-age=' + config.BROWSER_CACHE_TTL + ', immutable',
	);
	responseHeaders.set('Access-Control-Allow-Origin', '*');
	responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
	responseHeaders.set('X-Cache', 'MISS');

	// Preserve content length if available
	const contentLength = originResponse.headers.get('Content-Length');
	if (contentLength) {
		responseHeaders.set('Content-Length', contentLength);
	}

	// Create the proxy response
	const proxyResponse = new Response(originResponse.body, {
		status: 200,
		headers: responseHeaders,
	});

	// Store in cache asynchronously (if cache available)
	if (cache && ctx && ctx.waitUntil) {
		ctx.waitUntil(
			cache.put(cacheKey, proxyResponse.clone()).catch((err) => {
				console.error('Cache put error:', (err as Error).message);
			}),
		);
	}

	return proxyResponse;
}

/**
 * Create an error response
 */
function errorResponse(status: number, message: string): Response {
	return new Response(message, {
		status: status,
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'no-store',
		},
	});
}

// ============================================
// CORS HANDLING
// ============================================

/**
 * Handle CORS preflight requests for the proxy endpoint
 */
function handleCorsPreflight(): Response {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Accept',
			'Access-Control-Max-Age': '86400',
		},
	});
}

// ============================================
// ORIGINAL IMAGE PROXY (Edge Caching)
// ============================================

/**
 * Proxy original images for edge caching
 *
 * This function proxies original images through your domain for edge caching.
 * The proxied originals are then used as the source for Cloudflare's image transformation service.
 *
 * Flow:
 * 1. Browser requests: /cdn-cgi/image/format=auto,quality=85/https://yourdomain.com/img-original/...
 * 2. Cloudflare image transformer extracts: https://yourdomain.com/img-original/...
 * 3. Fetches from that URL (goes to this Worker)
 * 4. This function proxies original from Webflow CDN
 * 5. Original cached at Cloudflare edge
 * 6. Cloudflare transforms from cached original
 *
 * Caching Strategy:
 * This function uses only cf.cacheEverything (not manual Cache API) because:
 * 1. Original images are primarily fetched by Cloudflare's image transformer service
 * 2. The transformer service handles its own caching layer
 * 3. Manual Cache API would be redundant and could cause cache inconsistencies
 * 4. cf.cacheEverything ensures proper edge caching
 *
 * NOTE: Cache Reserve is not available with O2O proxying (Webflow uses O2O).
 * All images cache at Cloudflare edge with 1-year TTL for optimal performance.
 */
async function handleOriginalImageProxy(url: URL, config: Config, _ctx: ExecutionContext): Promise<Response> {
	// Extract the encoded URL from the path
	const encodedUrl = url.pathname.slice('/img-original/'.length);

	if (!encodedUrl) {
		return errorResponse(400, 'Missing URL parameter');
	}

	// Decode the URL
	let originalUrl: string;
	try {
		originalUrl = decodeURIComponent(encodedUrl);
	} catch {
		return errorResponse(400, 'Invalid URL encoding');
	}

	// Validate URL scheme
	if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
		return errorResponse(400, 'Invalid URL scheme');
	}

	// Security: Validate origin if not in catch-all mode
	if (!config.CATCH_ALL_EXTERNAL) {
		let parsedOrigin: URL;
		try {
			parsedOrigin = new URL(originalUrl);
		} catch {
			return errorResponse(400, 'Invalid URL');
		}

		const hostname = parsedOrigin.hostname.toLowerCase();
		const isAllowed = WEBFLOW_ORIGINS.some((origin) => hostname === origin || hostname.endsWith('.' + origin));

		if (!isAllowed) {
			return errorResponse(403, 'Origin not allowed');
		}
	}

	// Fetch from origin with edge caching enabled
	let originResponse: Response;
	try {
		originResponse = await fetch(originalUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker)',
				Accept: 'image/*,*/*',
			},
			cf: {
				cacheEverything: true,
				cacheTtl: config.EDGE_CACHE_TTL, // 1 year edge cache TTL
			},
		});
	} catch (error) {
		console.error('Origin fetch error:', (error as Error).message);
		return errorResponse(502, 'Failed to fetch from origin');
	}

	// Check origin response status
	if (!originResponse.ok) {
		return errorResponse(originResponse.status, 'Origin returned error: ' + originResponse.status);
	}

	// Verify response is an image
	const contentType = originResponse.headers.get('Content-Type') || '';
	if (!contentType || !contentType.startsWith('image/')) {
		return errorResponse(400, 'Response is not an image (Content-Type: ' + contentType + ')');
	}

	// Build response headers for edge caching
	const responseHeaders = new Headers();
	responseHeaders.set('Content-Type', contentType);
	responseHeaders.set(
		'Cache-Control',
		'public, s-maxage=' + config.EDGE_CACHE_TTL + ', max-age=' + config.BROWSER_CACHE_TTL + ', immutable',
	);

	// Preserve Content-Length for proper caching
	const contentLength = originResponse.headers.get('Content-Length');
	if (contentLength) {
		responseHeaders.set('Content-Length', contentLength);
	} else {
		// If origin doesn't provide Content-Length, log warning but still cache at edge
		console.error('Missing Content-Length header from origin');
	}

	responseHeaders.set('Access-Control-Allow-Origin', '*');
	responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
	responseHeaders.set('X-Cache', 'MISS');

	// Create the proxy response
	const proxyResponse = new Response(originResponse.body, {
		status: 200,
		headers: responseHeaders,
	});

	return proxyResponse;
}

// ============================================
// PROGRESSIVE SECTION LOADING
// ============================================

/**
 * Handle requests for individual sections
 */
async function handleSectionRequest(url: URL, _config: Config, _ctx: ExecutionContext): Promise<Response> {
	const sectionId = url.pathname.slice('/section/'.length);

	if (!sectionId || !/^\d+$/.test(sectionId)) {
		return errorResponse(400, 'Invalid section ID');
	}

	// Try to get from cache first
	const cacheKey = new Request(url.toString(), { method: 'GET' });
	let cache: Cache | null = null;

	try {
		cache = caches.default;
		const cachedResponse = await cache.match(cacheKey);

		if (cachedResponse) {
			const headers = new Headers(cachedResponse.headers);
			headers.set('X-Cache', 'HIT');
			return new Response(cachedResponse.body, {
				status: cachedResponse.status,
				headers: headers,
			});
		}
	} catch (e) {
		console.error('Cache unavailable:', (e as Error).message);
		cache = null;
	}

	return errorResponse(404, 'Section not found');
}

/**
 * Extract sections with optimised attribute and cache them separately
 */
async function extractAndCacheSections(
	html: string,
	config: Config,
	ctx: ExecutionContext,
	requestUrl: string,
): Promise<{ html: string; sections: ExtractedSection[] }> {
	const sectionsToStream: ExtractedSection[] = [];
	const sectionRegex = /<section([^>]*)>([\s\S]*?)<\/section>/gi;

	let sectionCounter = 0;
	let match;
	while ((match = sectionRegex.exec(html)) !== null) {
		const sectionAttrs = match[1];
		const fullSection = match[0];

		// Check if this section has optimised="none"
		const hasDontStream = /optimised=["']none["']/i.test(sectionAttrs);

		// Only extract sections that should be streamed (don't have none)
		if (!hasDontStream) {
			sectionCounter++;
			sectionsToStream.push({
				id: sectionCounter.toString(),
				html: fullSection,
			});
		}
	}

	// Cache each section that will be streamed
	if (ctx && ctx.waitUntil) {
		for (const section of sectionsToStream) {
			const sectionUrl = new URL(`/section/${section.id}`, requestUrl);
			const cacheKey = new Request(sectionUrl.toString(), { method: 'GET' });

			const headers = new Headers();
			headers.set('Content-Type', 'text/html; charset=utf-8');
			headers.set('Cache-Control', `public, s-maxage=${config.EDGE_CACHE_TTL}, max-age=${config.BROWSER_CACHE_TTL}, immutable`);
			headers.set('Access-Control-Allow-Origin', '*');

			const response = new Response(section.html, {
				status: 200,
				headers: headers,
			});

			ctx.waitUntil(
				caches.default.put(cacheKey, response).catch((err) => {
					console.error(`Cache put error for section ${section.id}:`, (err as Error).message);
				}),
			);
		}
	}

	// Replace streaming sections with placeholders
	let modifiedHtml = html;
	const MINIMUM_PLACEHOLDER_HEIGHT = 550; // Minimum height of placeholder
	for (const section of sectionsToStream) {
		const placeholder = `<div id="section-placeholder-${section.id}" data-section-id="${section.id}" class="section-placeholder" style="min-height:${MINIMUM_PLACEHOLDER_HEIGHT}px"></div>`;
		modifiedHtml = modifiedHtml.replace(section.html, placeholder);
	}

	return { html: modifiedHtml, sections: sectionsToStream };
}

/**
 * Inject Intersection Observer script to load sections progressively
 */
function injectSectionLoaderScript(html: string, sectionIds: string[], config: Config): string {
	// Skip if no sections to load
	if (sectionIds.length === 0) {
		return html;
	}
	const ROOT_MARGIN_HEIGHT = 200; //lesser the number, the lesser the aggressiveness of preloading
	const IDLE_TIMEOUT_MS = 30000; //time to wait after which load all sections
	const script = `
<script>
(function() {
	const sectionsToLoad = ${JSON.stringify(sectionIds)};
	const loadedSections = new Set();
	const loadingSections = new Set();

	function loadSection(sectionId) {
		if (loadedSections.has(sectionId) || loadingSections.has(sectionId)) {
			return;
		}
		
		loadingSections.add(sectionId);
		const placeholder = document.getElementById('section-placeholder-' + sectionId);
		
		if (!placeholder) {
			loadingSections.delete(sectionId);
			return;
		}

		fetch('/section/' + sectionId, {
			method: 'GET',
			headers: { 'Accept': 'text/html' }
		})
		.then(response => {
			if (!response.ok) throw new Error('Section load failed: ' + response.status);
			return response.text();
		})
		.then(html => {
			// Parse HTML and extract scripts
			const temp = document.createElement('div');
			temp.innerHTML = html;
			
			// Get all scripts before we modify the DOM
			const scripts = temp.querySelectorAll('script');
			const scriptContents = [];
			scripts.forEach(script => {
				scriptContents.push({
					src: script.src,
					textContent: script.textContent,
					type: script.type
				});
				script.remove();
			});
			
			// Now temp.innerHTML is script-free, get the first real element
			const section = temp.firstElementChild;
			
			if (section) {
				placeholder.replaceWith(section);
				loadedSections.add(sectionId);
				
				// Execute extracted scripts
				scriptContents.forEach(scriptInfo => {
					try {
						const newScript = document.createElement('script');
						if (scriptInfo.src) {
							newScript.src = scriptInfo.src;
							newScript.async = true;
						} else {
							newScript.textContent = scriptInfo.textContent;
						}
						newScript.type = scriptInfo.type || 'text/javascript';
						document.body.appendChild(newScript);
						console.log('Executed script from section:', sectionId);
					} catch(e) {
						console.error("Failed to execute script from section " + sectionId + ": ", e);
					}
				});
				
				// Dispatch events based on configuration
				const dispatchEvent = '${config.DISPATCH_EVENT}';
				try {
					if (dispatchEvent === 'SECTION_LOADED' || dispatchEvent === 'BOTH') {
						window.dispatchEvent(new CustomEvent('sectionLoaded', { detail: { sectionId } }));
						console.log('dispatched sectionLoaded event for section ' + sectionId);
					}
					
					if (dispatchEvent === 'DOM_LOADED' || dispatchEvent === 'BOTH') {
						document.dispatchEvent(new Event('DOMContentLoaded'));
						console.log('dispatched DOMContentLoaded event');
					}
				} catch(e) {
				console.error("Failed to dispatch events: ", e); 
				}
			}
		})
		.catch(err => {
			console.error('Failed to load section ' + sectionId + ':', err);
		})
		.finally(() => {
			loadingSections.delete(sectionId);
		});
	}

	// Set up Intersection Observer
	if ('IntersectionObserver' in window) {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const sectionId = entry.target.getAttribute('data-section-id');
					if (sectionId) {
						loadSection(sectionId);
						observer.unobserve(entry.target);
					}
				}
			});
		}, {
			rootMargin: '${ROOT_MARGIN_HEIGHT}px 0px', // Start loading 20px before section enters viewport
			threshold: 0.01
		});

		// Observe all section placeholders
		sectionsToLoad.forEach(sectionId => {
			const placeholder = document.getElementById('section-placeholder-' + sectionId);
			if (placeholder) {
				observer.observe(placeholder);
			}
		});

		// Fallback: Load all sections after 10 seconds if not loaded by scroll
		setTimeout(() => {
			sectionsToLoad.forEach(sectionId => {
				if (!loadedSections.has(sectionId)) {
					loadSection(sectionId);
				}
			});
		}, ${IDLE_TIMEOUT_MS});
	} else {
		// Fallback for browsers without IntersectionObserver - load immediately
		sectionsToLoad.forEach(loadSection);
	}
})();
</script>`;

	// Inject before </body>
	const bodyCloseIndex = html.lastIndexOf('</body>');
	if (bodyCloseIndex !== -1) {
		return html.slice(0, bodyCloseIndex) + script + html.slice(bodyCloseIndex);
	}

	// Fallback: append to end
	return html + script;
}

// ============================================
// SCHEDULED CACHE WARMING
// ============================================

import { calculateStats, getUrlsFromSitemap, warmCache } from './cache-warmer';

interface ScheduledEvent {
	scheduledTime: number;
	cron: string;
}

/**
 * Handle scheduled cache warming
 */
async function handleScheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
	const startTime = Date.now();
	console.log(`Cache warming started at ${new Date(event.scheduledTime).toISOString()}`);

	try {
		// Get domain from config
		const domain = env.DOMAIN;
		if (!domain) {
			throw new Error('DOMAIN environment variable is required for cache warming');
		}

		// Fetch URLs from sitemap
		const urls = await getUrlsFromSitemap(domain);
		console.log(`Found ${urls.length} URLs to warm`);

		// Warm cache (batch size of 5)
		const results = await warmCache(urls, 5);

		// Calculate statistics
		const stats = calculateStats(results);
		const totalDuration = Date.now() - startTime;

		console.log('Cache warming complete:', {
			totalUrls: results.length,
			successful: stats.successful,
			failed: stats.failed,
			cacheHits: stats.hits,
			cacheMisses: stats.misses,
			avgDuration: stats.avgDuration,
			totalDuration: `${totalDuration}ms`,
		});

		// Log any errors
		const errors = results.filter((r) => r.error);
		if (errors.length > 0) {
			console.error('Failed URLs:', errors);
		}
	} catch (error) {
		console.error('Cache warming error:', (error as Error).message, (error as Error).stack);
	}
}
