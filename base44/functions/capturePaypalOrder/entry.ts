import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { tokenHash, paypal, verifyCapturedOrder, fulfilPurchase } from '../../shared/paypal.ts';

export default async function(req) {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const { orderId, receiptId, captureToken } = await req.json();
    if (typeof orderId !== 'string' || !/^[A-Z0-9]{10,32}$/.test(orderId) || typeof receiptId !== 'string' || typeof captureToken !== 'string' || captureToken.length !== 72) return Response.json({ error: 'Invalid payment receipt' }, { status: 400 });
    const base44 = createClientFromRequest(req);
    const receipt = await base44.asServiceRole.entities.PaymentOrder.get(receiptId).catch(() => null);
    if (!receipt || receipt.order_id !== orderId || receipt.capture_token_hash !== await tokenHash(captureToken)) return Response.json({ error: 'Payment receipt not found' }, { status: 404 });
    if (receipt.user_id) {
      const user = await base44.auth.me();
      if (!user || user.id !== receipt.user_id) return Response.json({ error: 'Sign in to the purchasing account' }, { status: 403 });
    }
    if (['refunded', 'reversed'].includes(receipt.status)) return Response.json({ error: 'Payment was reversed' }, { status: 409 });
    let order = await paypal('/v2/checkout/orders/' + orderId);
    if (order.status !== 'COMPLETED') {
      if (!Number.isFinite(Date.parse(receipt.expires_at)) || Date.parse(receipt.expires_at) <= Date.now()) return Response.json({ error: 'Payment receipt expired' }, { status: 410 });
      if (order.status !== 'APPROVED') return Response.json({ error: 'Payment has not been approved' }, { status: 409 });
      // Check the merchant's recorded amount before charging, not just afterwards.
      const unit = order.purchase_units?.[0];
      if (order.purchase_units?.length !== 1 || unit.custom_id !== receipt.receipt_reference || unit.amount?.currency_code !== receipt.currency || unit.amount?.value !== receipt.amount_value) return Response.json({ error: 'Payment amount mismatch' }, { status: 409 });
      order = await paypal('/v2/checkout/orders/' + orderId + '/capture', 'POST', {}, receipt.receipt_reference);
    }
    const captureId = verifyCapturedOrder(order, receipt);
    await base44.asServiceRole.entities.PaymentOrder.update(receipt.id, { status: 'completed', capture_id: captureId, completed_at: new Date().toISOString() });
    await fulfilPurchase(base44, receipt, orderId);
    return Response.json({ success: true, status: 'COMPLETED', productType: receipt.product_type });
  } catch { return Response.json({ error: 'Payment could not be confirmed. Please retry confirmation before creating another donation.' }, { status: 502 }); }
}
