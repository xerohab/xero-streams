import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaCatalogueQuery } from '../src/components/browse/loadMediaRecords.js';

test('Kids catalogue continues through empty filtered pages and uses a profile-scoped cache key', async () => {
  const calls = [];
  const client = {
    entities: {},
    functions: {
      invoke: async (functionName, payload) => {
        calls.push({ functionName, ...payload });
        return payload.offset === 0
          ? { data: { rows: [], next: 500 } }
          : { data: { rows: [{ id: 'allowed' }], next: null } };
      },
    },
  };
  const query = mediaCatalogueQuery(client, 'series', 'kid-1');
  assert.deepEqual(query.queryKey, ['kids_catalogue', 'kid-1', 'series']);
  assert.notDeepEqual(query.queryKey, mediaCatalogueQuery(client, 'series', 'kid-2').queryKey);
  assert.notDeepEqual(query.queryKey, mediaCatalogueQuery(client, 'series', null).queryKey);
  assert.deepEqual(await query.queryFn(), [{ id: 'allowed' }]);
  assert.deepEqual(calls.map(({ profile_id, offset }) => [profile_id, offset]), [['kid-1', 0], ['kid-1', 500]]);
});

test('Kids catalogue refuses a repeated page offset', async () => {
  const client = { entities: {}, functions: { invoke: async () => ({ data: { rows: [], next: 0 } }) } };
  await assert.rejects(mediaCatalogueQuery(client, 'videos', 'kid').queryFn, /Invalid catalogue offset/);
});
