import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkoutProduct, tokenHash, paypal, checkoutOrigin } from '../../shared/paypal.ts';

export default async function(req) {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    let amount;
    try { amount = await checkoutProduct(base44, body); }
    catch { return Response.json({ error: 'This checkout is unavailable. Sign in for purchases, select an available item, or contact support about subscriptions.' }, { status: 400 }); }
    const siteOrigin = checkoutOrigin();
    const receiptReference = crypto.randomUUID();
    const captureToken = crypto.randomUUID() + crypto.randomUUID();
    const receipt = await base44.asServiceRole.entities.PaymentOrder.create({ receipt_reference: receiptReference, capture_token_hash: await tokenHash(captureToken), amount_value: amount.value, currency: amount.currency, status: 'created', product_type: amount.product_type, product_id: amount.product_id, format: amount.format, user_id: amount.user_id, expires_at: new Date(Date.now() + 24 * 3600000).toISOString() });
    const order = await paypal('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE', purchase_units: [{ custom_id: receiptReference, amount: { currency_code: amount.currency, value: amount.value }, description: amount.product_type === 'donation' ? 'Donation to Xero Streams' : 'Xero Streams ' + amount.product_type }],
      application_context: { brand_name: 'Xero Streams', user_action: 'PAY_NOW', return_url: amount.product_type === 'donation' ? siteOrigin + '/Donate?success=true' : siteOrigin + '/callback?success=true', cancel_url: amount.product_type === 'donation' ? siteOrigin + '/Donate?cancelled=true' : siteOrigin + '/callback?cancelled=true' }
    }, receiptReference);
    const approvalUrl = order.links?.find(link => link.rel === 'approve')?.href;
    const approval = new URL(approvalUrl);
    if (!/^[A-Z0-9]{10,32}$/.test(order.id) || approval.protocol !== 'https:' || !['www.paypal.com','www.sandbox.paypal.com'].includes(approval.hostname)) throw new Error('Invalid PayPal order response');
    await base44.asServiceRole.entities.PaymentOrder.update(receipt.id, { order_id: order.id });
    return Response.json({ orderId: order.id, approvalUrl, receiptId: receipt.id, captureToken });
  } catch { return Response.json({ error: 'Unable to create payment. Please try again later.' }, { status: 502 }); }
}
