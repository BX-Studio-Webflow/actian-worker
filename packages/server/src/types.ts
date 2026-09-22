import type { Env as HonoEnv } from 'hono';

export interface AppEnv extends HonoEnv {
	Bindings: Env;
	Variables: {
		requestId: string;
	};
}
