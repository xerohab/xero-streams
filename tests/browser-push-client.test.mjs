import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePushSubscription } from '../src/lib/browserPushSubscription.js';

test('push registration reuses the current key and replaces a subscription on key rotation', async () => {
  const key = new Uint8Array([1, 2, 3]);
  let unsubscribed = 0;
  let subscribed = 0;
  const old = {
    options: { applicationServerKey: key.buffer },
    unsubscribe: async () => { unsubscribed++; return true; },
  };
  const replacement = {};
  const manager = {
    getSubscription: async () => old,
    subscribe: async options => {
      assert.equal(options.userVisibleOnly, true);
      assert.deepEqual([...options.applicationServerKey], [3, 2, 1]);
      subscribed++;
      return replacement;
    },
  };
  assert.equal(await ensurePushSubscription(manager, key), old);
  assert.equal(unsubscribed, 0);
  assert.equal(subscribed, 0);
  assert.equal(await ensurePushSubscription(manager, new Uint8Array([3, 2, 1])), replacement);
  assert.equal(unsubscribed, 1);
  assert.equal(subscribed, 1);
});

test('the service worker displays a private release notification without an open app', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const handlers = new Map();
  const notifications = [];
  const self = {
    addEventListener: (type, listener) => handlers.set(type, listener),
    registration: { showNotification: async (title, options) => notifications.push({ title, options }) },
  };
  runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), { self });
  let task;
  const emitPush = payload => handlers.get('push')({
    data: { json: () => payload },
    waitUntil: promise => { task = promise; },
  });
  emitPush({ type: 'unknown', id: 'x', title: 'Ignored' });
  assert.equal(task, undefined);
  emitPush({ type: 'release', id: 'episode', title: 'Private title', link: 'https://example.test/private' });
  await task;
  assert.equal(notifications.length, 1);
  const [{ title, options }] = notifications;
  assert.equal(title, 'XeroStreams');
  assert.equal(options.data.link, '/dashboard');
  assert.equal(options.body.includes('Private title'), false);
});
