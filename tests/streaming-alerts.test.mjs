import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../base44/functions/streamingAlerts/entry.ts';

const invoke = body => handler(new Request('https://example.test', {
  method: 'POST', body: JSON.stringify(body)
}));

test('release delivery requires an authenticated administrator', async () => {
  for (const [user, status] of [
    [null, 401],
    [{ role: 'user' }, 403],
    [{ role: 'admin', is_banned: true }, 403]
  ]) {
    globalThis.__testClient = { auth: { me: async () => user }, asServiceRole: { entities: {} } };
    assert.equal((await invoke({ action: 'deliver' })).status, status);
  }
});

test('the scheduled administrator sends a private push only once per active device', async () => {
  const sent = [], receipts = [];
  const notification = { id: 'n', created_date: new Date().toISOString(), email_sent: true };
  globalThis.Deno = { env: { get: name => name.startsWith('XERO_VAPID_') ? 'configured' : undefined } };
  globalThis.__testPush = async (subscription, payload) => sent.push({ subscription, payload: JSON.parse(payload) });
  globalThis.__testClient = {
    auth: { me: async () => ({ role: 'admin' }) },
    asServiceRole: { entities: {
      SeriesFollow: { list: async () => [] },
      ReleaseReminder: { list: async () => [{ user_id: 'u', video_id: 'v' }] },
      Video: { filter: async () => [{ id: 'v', title: 'Private title', video_url: 'https://media.example.test/video' }] },
      StreamingNotification: { filter: async () => [notification] },
      User: { filter: async () => [{ id: 'u' }] },
      BrowserPushSubscription: { filter: async () => [
        { id: 's', device_id: 'd', endpoint: 'https://fcm.googleapis.com/push' },
        { id: 'revoked', device_id: 'r', endpoint: 'https://fcm.googleapis.com/revoked' }
      ] },
      StreamingDevice: { filter: async ({ device_id }) => [{ revoked: device_id === 'r' }] },
      BrowserPushReceipt: {
        filter: async key => receipts.filter(row => row.subscription_id === key.subscription_id),
        create: async row => receipts.push(row)
      }
    } }
  };
  assert.deepEqual(await (await invoke({})).json(), { sent: 0, failed: 0, pushed: 1, pushEnabled: true });
  assert.deepEqual(await (await invoke({})).json(), { sent: 0, failed: 0, pushed: 0, pushEnabled: true });
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].payload, { type: 'release', id: 'n', title: 'A release is available', link: '/dashboard' });
});
