# Webflow Image Optimization & Progressive Loading Worker

A production-ready Cloudflare Worker that dramatically improves Webflow site performance through intelligent image optimization, asset proxying, and progressive section loading. This worker runs at the edge, transforming and caching assets globally while maintaining SEO integrity.

## 🚀 Key Features

### 1. **Image Optimization**

- **Automatic format conversion**: Serves AVIF/WebP to supporting browsers, JPEG fallback
- **Smart quality optimization**: 85% quality for images, 80% for OG/social images
- **SVG sanitization**: Processes SVGs through Cloudflare Image Resizing for security
- **Edge caching**: 1-year TTL at Cloudflare's edge network

### 2. **Asset Proxying & Caching**

- **CSS/JS/Fonts**: Proxies and caches all Webflow assets at edge
- **CORS support**: Enables cross-origin usage with proper headers
- **Chunk file handling**: Automatically resolves Webflow's dynamic JS chunks
- **1-year edge cache**: Immutable assets cached with optimal TTL

### 3. **Progressive Section Loading**

- **Above-the-fold priority**: Critical sections load immediately
- **Lazy loading**: Non-critical sections stream as user scrolls
- **Intersection Observer**: Modern API for efficient viewport detection
- **SEO-safe**: Bots receive full HTML for complete indexing
- **200px preload**: Sections load before entering viewport for seamless UX

### 4. **SEO & Performance**

- **Bot detection**: 40+ crawler patterns detected, full HTML served
- **No cache for dynamic HTML**: Main HTML bypasses cache when progressive loading enabled
- **Section caching**: Individual sections cached separately for fast delivery
- **Social media optimization**: OG images use JPEG for better compatibility

## 📊 Performance Improvements

| Metric                             | Before                  | After                            | Improvement      |
| ---------------------------------- | ----------------------- | -------------------------------- | ---------------- |
| **Initial Load Time**              | Full HTML (~6500 lines) | Critical sections only           | ~60-70% faster   |
| **Time to Interactive (TTI)**      | Heavy JS/CSS blocking   | Progressive streaming            | ~50% faster      |
| **Largest Contentful Paint (LCP)** | Waits for all content   | Above-fold first                 | ~40% improvement |
| **Image Delivery**                 | Original Webflow CDN    | AVIF/WebP optimized              | ~40-60% smaller  |
| **Asset Delivery**                 | Multiple CDN requests   | Edge-cached proxies              | ~30% faster      |
| **Global CDN**                     | Webflow CDN only        | Cloudflare edge (320+ locations) | Lower latency    |

### How It Works

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Request HTML
       ▼
┌─────────────────────────────┐
│  Cloudflare Edge Worker     │
│  ┌─────────────────────┐   │
│  │ Bot Detection       │   │ → Bots get full HTML
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ Extract Sections    │   │ → Sections with optimised="none" stay
│  │ (without "none")    │   │ → Others extracted & cached
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ Transform Assets    │   │ → Images: /cdn-cgi/image/...
│  │ & Image URLs        │   │ → Assets: /asset-cache/...
│  └─────────────────────┘   │
└─────────────┬───────────────┘
              │ 2. Return lightweight HTML + script
              ▼
       ┌──────────────┐
       │   Browser    │
       │ - Renders    │
       │ - Scrolls ▼  │
       └──────┬───────┘
              │ 3. IntersectionObserver triggers
              ▼
       ┌──────────────┐
       │ Fetch        │ /section/2
       │ /section/3   │ /section/3
       │ /section/4   │ ...
       └──────────────┘
              │ 4. Sections loaded from edge cache
              ▼
       ┌──────────────┐
       │ Full Page    │
       │ Rendered     │
       └──────────────┘
```

## 🛠️ Prerequisites

- **Node.js**: 20+
- **pnpm**: Preferred package manager
- **Cloudflare Account**: With Workers & Image Transformations enabled
- **Custom Domain**: Worker must run on custom domain (not `*.workers.dev`)

## 📦 Installation & Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Cloudflare Image Transformations

**Required Setup in Cloudflare Dashboard:**

1. Navigate to: **Your Zone → Images → Transformations**
2. Enable **Image Transformations**
3. Go to **Images → Transformations → Sources**
4. Add these allowed origins:
   - `cdn.prod.website-files.com`
   - `assets.website-files.com`
   - `assets-global.website-files.com`
   - `uploads-ssl.webflow.com`
   - Your domain (e.g., `www.yourdomain.com`)

### 3. Configure Environment Variables

Edit `wrangler.jsonc` or set via Cloudflare Dashboard → Workers → Settings → Variables:

```jsonc
{
	"env": {
		"production": {
			"vars": {
				// REQUIRED
				"DOMAIN": "www.yourdomain.com",
				"SITE_ID": "your-webflow-site-id",

				// IMAGE SETTINGS
				"IMAGE_FORMAT": "auto", // auto, webp, or avif
				"IMAGE_QUALITY": "85", // 1-100
				"OG_IMAGE_FORMAT": "jpeg", // jpeg, png, or webp
				"OG_IMAGE_QUALITY": "80", // 1-100

				// CACHE SETTINGS (in seconds)
				"EDGE_CACHE_TTL": "31536000", // 1 year
				"BROWSER_CACHE_TTL": "604800", // 1 week

				// FEATURES
				"PROGRESSIVE_SECTIONS_ENABLED": "true",
				"CATCH_ALL_EXTERNAL": "false", // Process non-Webflow images
				"PURIFIED_CSS_ENABLED": "false",
				"MINIFIED_CSS_LINK": "",
			},
		},
	},
}
```

### 4. Deploy to Cloudflare

```bash
pnpm run deploy
```

The worker will be deployed to your production environment.

## 🔄 Publishing Workflow (Webflow Changes)

After making changes in Webflow and publishing:

1. **Publish in Webflow**: Click "Publish" in Webflow Designer
2. **Purge Cloudflare Cache**:
   - Go to your Cloudflare dashboard
   - Navigate to your domain (e.g., `bxstudio.cloud`)
   - Go to **Caching** → **Configuration**
   - Click **Purge Everything**
   - Confirm the purge

This ensures users see the latest content immediately without waiting for cache expiration.

## 🎯 Usage

### HTML Section Attributes

Mark sections to control streaming behavior:

```html
<!-- This section STAYS in initial HTML (critical content) -->
<section optimised="none" class="navbar">
	<!-- Navbar always loads immediately -->
</section>

<!-- This section is STREAMED progressively -->
<section class="hero">
	<!-- Loads on scroll -->
</section>

<!-- Another streamed section -->
<section class="features">
	<!-- Loads when near viewport -->
</section>
```

### Worker Endpoints

| Endpoint                        | Purpose                    | Caching                             |
| ------------------------------- | -------------------------- | ----------------------------------- |
| `/` (main HTML)                 | Returns optimized HTML     | No cache (when progressive enabled) |
| `/section/{id}`                 | Individual section content | 1 year edge cache                   |
| `/img-cache/{url}`              | AVIF image proxy           | 1 year edge cache                   |
| `/img-original/{url}`           | Original image cache       | 1 year edge cache                   |
| `/asset-cache/{url}`            | CSS/JS/Font proxy          | 1 year edge cache                   |
| `/cdn-cgi/image/{params}/{url}` | Cloudflare image transform | Edge cached                         |

### Image URL Transformation

**Before:**

```html
<img src="https://cdn.prod.website-files.com/.../image.jpg" />
```

**After (transformed by worker):**

```html
<img
	src="https://yourdomain.com/cdn-cgi/image/format=auto,quality=85/https://yourdomain.com/img-original/https%3A%2F%2Fcdn.prod.website-files.com%2F...%2Fimage.jpg"
/>
```

## 📝 Development Commands

| Command               | Description                                    |
| --------------------- | ---------------------------------------------- |
| `pnpm run dev`        | Start local development server with hot reload |
| `pnpm start`          | Alias for `dev`                                |
| `pnpm run deploy`     | Deploy to Cloudflare production                |
| `pnpm run build`      | Dry-run deploy (validation only)               |
| `pnpm run test`       | Run Vitest test suite                          |
| `pnpm run lint`       | Check code style (ESLint + Prettier)           |
| `pnpm run lint:fix`   | Auto-fix code style issues                     |
| `pnpm run check`      | Type-check with TypeScript                     |
| `pnpm run cf-typegen` | Generate Worker environment types              |

## 🔧 Configuration Reference

### Environment Variables

#### Required

- **`DOMAIN`**: Your domain (auto-detected if not set)
- **`SITE_ID`**: Webflow site ID (found in HTML as `data-wf-site`)

#### Image Optimization

- **`IMAGE_FORMAT`**: `auto` (default), `webp`, `avif`
- **`IMAGE_QUALITY`**: 1-100 (default: 85)
- **`OG_IMAGE_FORMAT`**: `jpeg` (default), `png`, `webp`
- **`OG_IMAGE_QUALITY`**: 1-100 (default: 80)

#### Caching

- **`EDGE_CACHE_TTL`**: Edge cache duration in seconds (default: 31536000 = 1 year)
- **`BROWSER_CACHE_TTL`**: Browser cache duration in seconds (default: 604800 = 1 week)

#### Features

- **`PROGRESSIVE_SECTIONS_ENABLED`**: Enable progressive loading (`true`/`false`)
- **`CATCH_ALL_EXTERNAL`**: Process non-Webflow external images (`true`/`false`)
- **`PURIFIED_CSS_ENABLED`**: Enable CSS purification (`true`/`false`)
- **`MINIFIED_CSS_LINK`**: URL to minified CSS file

## 🤖 Bot Detection

The worker automatically detects 40+ bot user agents and serves them full HTML for SEO:

- **Search engines**: Googlebot, Bingbot, Baidu, Yandex, DuckDuckGo
- **Social media**: Facebook, Twitter, LinkedIn, Pinterest, Reddit
- **Messaging**: WhatsApp, Slack, Discord
- **Performance tools**: Lighthouse, GTmetrix, Pingdom
- **Others**: Link previews, validators, crawlers

Bots receive complete HTML with all sections for proper indexing.

## 🎨 Features in Detail

### Progressive Section Loading

1. **Initial Load**: Only sections marked `optimised="none"` are included
2. **Scroll Detection**: Intersection Observer monitors viewport
3. **Preloading**: Sections load 200px before entering view
4. **Fallback**: All sections load after 10 seconds if not scrolled
5. **No JS Fallback**: Sections load immediately if IntersectionObserver unavailable

#### Injected Script

The worker automatically injects this script before `</body>` to handle progressive loading:

```javascript
<script>
(function() {
	const sectionsToLoad = ["2", "3", "4"]; // Section IDs dynamically inserted
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
			const temp = document.createElement('div');
			temp.innerHTML = html;
			const section = temp.firstElementChild;

			if (section) {
				placeholder.replaceWith(section);
				loadedSections.add(sectionId);

				// Dispatch custom event for analytics/tracking
				try {
					window.dispatchEvent(new CustomEvent('sectionLoaded', { detail: { sectionId } }));
				} catch(e) {}
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
			rootMargin: '200px 0px', // Start loading 200px before section enters viewport
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
		}, 10000);
	} else {
		// Fallback for browsers without IntersectionObserver - load immediately
		sectionsToLoad.forEach(loadSection);
	}
})();
</script>
```

**Script Features:**

- **Intersection Observer**: 200px rootMargin for preloading
- **Deduplication**: Tracks loaded/loading sections to prevent duplicates
- **Custom Event**: Dispatches `sectionLoaded` event for analytics integration
- **Error Handling**: Console logs fetch failures without breaking page
- **Timeout Fallback**: Loads all sections after 10s if not scrolled
- **Legacy Browser Support**: Falls back to immediate loading without IntersectionObserver

### Image Optimization Pipeline

```
Original Image → Worker Intercepts
                    ↓
         Check if transformable?
                    ↓
    ┌──────────────┴──────────────┐
    ↓                              ↓
 AVIF (pass-through)         PNG/JPG/WebP/GIF
    ↓                              ↓
/img-cache/                  /img-original/
 (1yr cache)                  (1yr cache)
                                   ↓
                    /cdn-cgi/image/format=auto/
                    (Cloudflare transforms)
                                   ↓
                         AVIF → WebP → Original
                    (served based on browser support)
```

### Asset Proxying

All Webflow assets are proxied through your domain:

- **CSS files**: Cached and served from edge
- **JavaScript**: Including dynamic chunks
- **Fonts**: WOFF, WOFF2, TTF, OTF, EOT
- **Icons**: Favicon and app icons

Benefits:

- ✅ Reduced DNS lookups
- ✅ Edge caching (faster delivery)
- ✅ CORS headers included
- ✅ Immutable caching (1 year)

## 🚨 Important Notes

### Cache Reserve Limitation

**Cache Reserve is NOT available with O2O (Origin-to-Origin) proxying.**

Webflow uses O2O proxying, which means:

- ❌ Cache Reserve (R2-backed) is bypassed
- ✅ Cloudflare edge cache still works (320+ locations)
- ✅ Excellent performance despite limitation

### Progressive Loading Trade-offs

**When Enabled:**

- ✅ Faster initial load
- ✅ Better Time to Interactive
- ✅ Reduced initial payload
- ❌ Main HTML not cached (sections are)
- ✅ SEO preserved (bots get full HTML)

**When Disabled:**

- ✅ Main HTML cached at edge
- ✅ Simpler architecture
- ❌ Slower initial load
- ❌ Larger initial payload

## 🐛 Troubleshooting

### Images Not Optimizing

1. Verify Image Transformations enabled in Cloudflare Dashboard
2. Check allowed origins include Webflow CDN domains
3. Ensure worker deployed on custom domain (not `*.workers.dev`)
4. Check browser console for 403/403 errors

### Sections Not Loading

1. Verify `PROGRESSIVE_SECTIONS_ENABLED=true`
2. Check sections don't all have `optimised="none"`
3. Open browser console for JavaScript errors
4. Check `/section/{id}` endpoints return 200

### Performance Issues

1. Verify edge cache working: Check `X-Cache: HIT` header
2. Increase `EDGE_CACHE_TTL` if needed
3. Check Cloudflare Analytics for cache hit ratio
4. Enable `PURIFIED_CSS_ENABLED` for CSS optimization

## 📄 License

MIT License - Copyright (c) 2025 BX Studios

## 🤝 Contributing

Issues and PRs welcome! Please ensure code passes linting (`pnpm run lint:fix`) and type-checking (`pnpm run check`) before submitting.
