import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'sqlite',
    driver: 'd1-http',
    schema: './src/schema/schema.ts',
    out: './src/schema/migrations',
    dbCredentials: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '59aa7befa9d1b3d2d72d78676dd7001d',
        databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? '',
        token: process.env.CLOUDFLARE_API_TOKEN ?? '',
    },
    verbose: true,
    strict: true,
});