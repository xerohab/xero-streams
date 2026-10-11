import { secrets } from 'base44:runtime';

export function donationAmount(amount, currency = 'GBP') {
  const text = String(amount);
  if (currency !== 'GBP' || !/^\d{1,5}(\.\d{1,2})?$/.test(text)) throw new Error('Invalid donation amount or currency');
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents < 100 || cents > 1000000) throw new Error('Donation must be between £1 and £10,000');
  return { cents, value: (cents / 100).toFixed(2), currency: 'GBP' };
}
export async function tokenHash(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
function apiBase() {
  const environment = secrets.get('PAYPAL_ENVIRONMENT') || 'live';
  if (!['live', 'sandbox'].includes(environment)) throw new Error('Invalid PayPal environment');
  return environment === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}
export function checkoutOrigin() {
  const configured = secrets.get('PAYPAL_SITE_ORIGIN') || 'https://xerostreams.com';
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid checkout origin');
  const host = url.hostname;
  const sandbox = secrets.get('PAYPAL_ENVIRONMENT') === 'sandbox';
  if (host !== 'xerostreams.com' && !(sandbox && (host.endsWith('.base44.app') || host.endsWith('.base44.com')))) throw new Error('Invalid checkout origin');
  return url.origin;
}
export async function paypal(path, method = 'GET', body = undefined, requestId = undefined) {
  const clientId = secrets.get('PAYPAL_CLIENT_ID');
  const clientSecret = secrets.get('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('PayPal is not configured');
  const base = apiBase();
  const auth = await fetch(base + '/v1/oauth2/token', {
    method: 'POST', headers: { Authorization: 'Basic ' + btoa(clientId + ':' + clientSecret), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials', signal: AbortSignal.timeout(15000)
  });
  const credentials = await auth.json();
  if (!auth.ok || typeof credentials.access_token !== 'string') throw new Error('PayPal authentication unavailable');
  const headers = { Authorization: 'Bearer ' + credentials.access_token, 'Content-Type': 'application/json' };
  if (requestId) headers['PayPal-Request-Id'] = requestId;
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw new Error('PayPal request could not be completed');
  return data;
}
export function verifyCapturedOrder(order, receipt) {
  if (order.id !== receipt.order_id || order.status !== 'COMPLETED' || order.purchase_units?.length !== 1) throw new Error('Payment is not confirmed');
  const unit = order.purchase_units[0];
  const captures = unit.payments?.captures || [];
  if (unit.custom_id !== receipt.receipt_reference || captures.length !== 1) throw new Error('Payment receipt mismatch');
  const capture = captures[0];
  if (!capture.id || capture.status !== 'COMPLETED' || capture.amount?.currency_code !== receipt.currency || capture.amount?.value !== receipt.amount_value) throw new Error('Payment amount or status mismatch');
  return capture.id;
}

export async function checkoutProduct(base44, body) {
  if (!body.product_type || body.product_type === 'donation') return { ...donationAmount(body.amount, body.currency), product_type: 'donation' };
  const user = await base44.auth.me();
  if (!user) throw new Error('Sign in required for purchases');
  const types = { book: 'Book', video: 'Video', subscription: 'SubscriptionPlan' };
  const entity = types[body.product_type];
  if (!entity || typeof body.product_id !== 'string' || !body.product_id) throw new Error('Invalid product');
  const product = await base44.asServiceRole.entities[entity].get(body.product_id);
  if (!product || (body.product_type === 'video' ? product.is_for_sale !== true : product.is_active !== true)) throw new Error('Product unavailable');
  // Orders CAPTURE cannot establish a recurring billing agreement.
  if (body.product_type === 'subscription' && product.interval !== 'lifetime') throw new Error('Recurring billing requires a PayPal subscription integration');
  const format = body.format || 'default';
  if (body.product_type === 'book' && !['default','word','ebook'].includes(format)) throw new Error('Invalid book format');
  const price = body.product_type === 'book' && format !== 'default' ? (product['price_' + format] ?? product.price) : product.price;
  return { ...donationAmount(price, body.currency), product_type: body.product_type, product_id: product.id, format: body.product_type === 'book' ? format : undefined, user_id: user.id };
}
export async function fulfilPurchase(base44, receipt, orderId) {
  if (receipt.product_type === 'donation') return;
  const types = { book: 'BookPurchase', video: 'VideoPurchase', subscription: 'UserSubscription' };
  const entity = types[receipt.product_type];
  if (!entity || !receipt.user_id || !receipt.product_id) throw new Error('Invalid purchase receipt');
  const store = base44.asServiceRole.entities[entity];
  const existing = await store.filter({ user_id: receipt.user_id, paypal_order_id: orderId });
  if (existing.length) return; // Sequential retry; Base44 has no atomic unique insert.
  const fields = { book: 'book_id', video: 'video_id', subscription: 'plan_id' };
  await store.create({ user_id: receipt.user_id, [fields[receipt.product_type]]: receipt.product_id, status: receipt.product_type === 'subscription' ? 'active' : 'completed', paypal_order_id: orderId, ...(receipt.product_type === 'book' ? { format: receipt.format || 'default' } : {}) });
  // Preserve pre-existing subscriptions. Billing replacement/expiry needs an explicit policy.
}
