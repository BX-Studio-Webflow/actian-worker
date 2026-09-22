declare module 'cloudflare:test' {
	interface ProvidedEnv extends Env {}
}

declare module '*.sql?raw' {
	const sql: string;
	export default sql;
}
