import { Hono } from 'hono';

import { download, issueDownloadLink } from './controllers/download';
import { receiveMarketoWebhook } from './controllers/marketo';
import { cors } from './middleware/cors';
import { requestId } from './middleware/request-id';
import { requestLog } from './middleware/request-log';
import type { AppEnv } from './types';
import { jsonError, jsonOk } from './utils/download';

const app = new Hono<AppEnv>();

app.use('*', cors, requestId, requestLog);

app.get('/health', () => jsonOk({ status: 'ok' }));
app.post('/api/link', issueDownloadLink);
app.on(['GET', 'HEAD'], '/download/:token', download);
app.post('/webhook/marketo', receiveMarketoWebhook);

app.notFound(() => jsonError(404, 'not_found', 'Not found.'));
app.onError((error) => {
	console.error('Worker error:', error.message);
	return jsonError(500, 'internal_error', 'Request failed.');
});

export default app;
