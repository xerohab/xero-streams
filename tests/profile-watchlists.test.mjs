import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfileWatchlists } from '../src/lib/profileWatchlists.js';

test('Kids watchlists are requested by profile and do not inherit legacy account lists', async () => {
  const entity = { filter: async query => {
    assert.deepEqual(query, { user_id: 'owner', profile_id: 'kid' });
    return [{ id: 'saved', profile_id: 'kid' }, { id: 'legacy' }, { id: 'parent', profile_id: 'adult' }];
  } };
  const rows = await loadProfileWatchlists(entity, 'owner', { id: 'kid', is_kids: true, is_default: true });
  assert.deepEqual(rows.map(row => row.id), ['saved']);
});

test('default adult watchlists keep access to legacy lists', async () => {
  const entity = { filter: async query => {
    assert.deepEqual(query, { user_id: 'owner' });
    return [{ id: 'saved', profile_id: 'adult' }, { id: 'legacy' }, { id: 'other', profile_id: 'kid' }];
  } };
  const rows = await loadProfileWatchlists(entity, 'owner', { id: 'adult', is_default: true });
  assert.deepEqual(rows.map(row => row.id), ['saved', 'legacy']);
});
