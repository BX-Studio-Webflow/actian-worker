import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				isolatedStorage: false,
				miniflare: {
					bindings: {
						TOKEN_SECRET: 'test-secret-do-not-use-in-production',
						ALLOWED_FILES: '{"trials/sample.bin":"trials/sample.bin"}',
					},
				},
			},
		},
	},
});
