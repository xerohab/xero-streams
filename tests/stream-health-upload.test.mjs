import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/streamHealth/entry.ts';

test('health upload batches video lookup and skips duplicate, stale, and replayed rows', async () => {
  const checkedAt = '2025-01-01T00:00:00.000Z';
  const checks = ['fresh', 'replayed', 'newer', 'changed'].map(id => ({
    id, status: 'reachable', revision: 'r', checked_at: checkedAt, http_status: 206,
  }));
  const reads = [];
  const saved = [];
  globalThis.Deno = { env: { get: () => undefined } };
  globalThis.__testClient = { auth: { me: async () => ({ role: 'admin' }) }, asServiceRole: { entities: {
    Video: { filter: async (query, _sort, limit) => {
      const ids = query.id.$in;
      reads.push(ids);
      assert.equal(limit, ids.length);
      return ids.map(id => ({ id, updated_date: id === 'changed' ? 'next' : 'r' }));
    } },
    StreamHealthResult: {
      filter: async ({video_id}) => {
        if (video_id === 'replayed') return [{ revision: 'r', status: 'reachable', checked_at: checkedAt, http_status: 206 }];
        if (video_id === 'newer') return [{ checked_at: '2025-02-01T00:00:00.000Z' }];
        return [];
      },
      create: async row => saved.push(row),
    },
  } } };
  const response = await handler(new Request('https://example.test', {
    method: 'POST', body: JSON.stringify({ action: 'results', rows: [...checks, checks[0]] }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: 1, skipped: 4 });
  assert.deepEqual(reads, [['fresh', 'replayed', 'newer', 'changed']]);
  assert.deepEqual(saved.map(row => row.video_id), ['fresh']);
});
