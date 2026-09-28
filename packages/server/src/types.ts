import type { Env as HonoEnv } from 'hono';

export interface AppEnv extends HonoEnv {
	Bindings: Env & {
		LEAD_HASH_SECRET?: string;
		MARKETO_BASE_URL?: string;
		MARKETO_CLIENT_ID?: string;
		MARKETO_CLIENT_SECRET?: string;
	};
	Variables: {
		requestId: string;
	};
}
