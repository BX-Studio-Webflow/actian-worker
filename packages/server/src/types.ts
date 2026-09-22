import type { Env as HonoEnv } from 'hono';

export interface AppEnv extends HonoEnv {
	Bindings: Env & {
		LEAD_HASH_SECRET?: string;
	};
	Variables: {
		requestId: string;
	};
}
