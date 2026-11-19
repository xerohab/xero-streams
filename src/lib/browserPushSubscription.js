export async function ensurePushSubscription(pushManager, applicationServerKey) {
  const existing = await pushManager.getSubscription();
  if (existing) {
    const currentKey = existing.options?.applicationServerKey;
    if (!currentKey) return existing;

    const bytes = new Uint8Array(currentKey);
    if (bytes.length === applicationServerKey.length &&
      bytes.every((byte, index) => byte === applicationServerKey[index])) {
      return existing;
    }
    await removeLocalPushSubscription(pushManager, existing);
  }
  return pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
}

export async function removeLocalPushSubscription(pushManager, subscription) {
  if (!pushManager) return;
  const current = subscription ?? await pushManager.getSubscription();
  if (current && !await current.unsubscribe() && await pushManager.getSubscription()) {
    throw new Error("Could not remove the browser push subscription");
  }
}
