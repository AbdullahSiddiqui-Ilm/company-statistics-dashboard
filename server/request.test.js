import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchStatistics } from '../client/src/api.js';
const stalledFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
});
test('stalled statistics request becomes an actionable timeout error', async () => {
  await assert.rejects(fetchStatistics('/api/statistics', { timeoutMs: 20, fetchImpl: stalledFetch }), /took too long/);
});
test('unmount cancellation is preserved rather than reported as timeout', async () => {
  const controller = new AbortController();
  const request = fetchStatistics('/api/statistics', { signal: controller.signal, fetchImpl: stalledFetch });
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
});
test('successful responses and server error messages are preserved', async () => {
  assert.deepEqual(await fetchStatistics('/api/statistics', { fetchImpl: async () => ({ ok: true, json: async () => ({ monthly: [] }) }) }), { monthly: [] });
  await assert.rejects(fetchStatistics('/api/statistics', { fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'Database unavailable' }) }) }), /Database unavailable/);
});
