import { z } from 'zod';

export const downloadLinkRequestSchema = z.object({
	email: z.string(),
	file: z.string(),
});
