import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('Worker', () => {
	it('GET / returns 200 with OK', async () => {
		const request = new Request('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('OK');
	});

	it('GET /unknown returns 404', async () => {
		const request = new Request('http://example.com/unknown');
		const response = await SELF.fetch(request);
		expect(response.status).toBe(404);
	});
});
