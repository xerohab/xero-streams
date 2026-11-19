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
    const removed = await existing.unsubscribe();
    if (!removed && await pushManager.getSubscription()) {
      throw new Error("Could not replace the previous push subscription");
    }
  }
  return pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
}
