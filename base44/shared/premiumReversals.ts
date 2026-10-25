// Read-only provider evidence; this module never captures, refunds or disputes a payment.
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
const fail=()=>{throw Error('PREMIUM_REVERSAL_NOT_VERIFIED');};
export function paymentMinor(amount,currency='GBP'){
 if(amount?.currency_code!==currency||! /^(0|[1-9][0-9]*)\.[0-9]{2}$/.test(amount.value||''))fail();
 const value=BigInt(amount.value.replace('.',''));if(value<1n||value>10000000n)fail();return Number(value);
}
function refundParent(refund,capture,environment){
 const expected=environment==='sandbox'?['api-m.sandbox.paypal.com','api.sandbox.paypal.com']:['api-m.paypal.com','api.paypal.com'];
 const links=refund.links?.filter(link=>link.rel==='up'&&link.method==='GET');
 if(!Array.isArray(links)||links.length!==1)fail();
 const url=new URL(links[0].href);
 if(url.protocol!=='https:'||!expected.includes(url.hostname)||url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/v2/payments/captures/'+capture)fail();
}
export async function premiumReversalProof({binding,order,read,eventType,reference,environment='live',now=Date.now()}){
 if(!['purchase_refunded','chargeback_issued'].includes(eventType)||!id(reference)||binding?.status!=='completed'||!id(binding.capture_id)||!id(binding.order_id)||binding.currency!=='GBP')fail();
 const original=paymentMinor({currency_code:binding.currency,value:binding.expected_amount});
 const units=order?.purchase_units,captures=units?.[0]?.payments?.captures;
 if(order.id!==binding.order_id||order.status!=='COMPLETED'||!Array.isArray(units)||units.length!==1||units[0].custom_id!=='PSPREMIUM:'+binding.id||paymentMinor(units[0].amount)!==original||!Array.isArray(captures)||captures.length!==1||captures[0].id!==binding.capture_id||paymentMinor(captures[0].amount)!==original||captures[0].create_time!==binding.captured_at)fail();
 const capture=await read('/v2/payments/captures/'+binding.capture_id);
 if(capture.id!==binding.capture_id||paymentMinor(capture.amount)!==original||!['COMPLETED','PARTIALLY_REFUNDED','REFUNDED'].includes(capture.status)||capture.supplementary_data?.related_ids?.order_id&&capture.supplementary_data.related_ids.order_id!==binding.order_id)fail();
 let individual,cumulative,occurred;
 if(eventType==='purchase_refunded'){
  const refund=await read('/v2/payments/refunds/'+reference);
  if(refund.id!==reference||refund.status!=='COMPLETED')fail();refundParent(refund,binding.capture_id,environment);
  individual=paymentMinor(refund.amount);
  cumulative=capture.status==='REFUNDED'?original:paymentMinor(refund.seller_payable_breakdown?.total_refunded_amount);
  if(!['PARTIALLY_REFUNDED','REFUNDED'].includes(capture.status))fail();
  occurred=refund.update_time||refund.create_time;
 }else{
  const dispute=await read('/v1/customer/disputes/'+reference),transactions=dispute.disputed_transactions;
  // Partial disputes can overlap refunds. Without a definitive combined provider total they require review.
  if(dispute.dispute_id!==reference||dispute.status!=='RESOLVED'||dispute.dispute_channel!=='EXTERNAL'||!['CHARGEBACK','PRE_ARBITRATION','ARBITRATION'].includes(dispute.dispute_life_cycle_stage)||dispute.dispute_outcome?.outcome_code!=='RESOLVED_BUYER_FAVOUR'||!Array.isArray(transactions)||transactions.length!==1||transactions[0].seller_transaction_id!==binding.capture_id||paymentMinor(transactions[0].gross_amount)!==original||paymentMinor(dispute.dispute_outcome.amount_refunded)!==original)fail();
  individual=original;cumulative=original;occurred=dispute.update_time;
 }
 if(individual>original||cumulative<individual||cumulative>original||!Number.isFinite(Date.parse(occurred))||Date.parse(occurred)>now+5000||!Number.isFinite(Date.parse(binding.captured_at))||Date.parse(occurred)<Date.parse(binding.captured_at))fail();
 return {provider:'paypal',partner_account_reference:binding.user_id,order_reference:binding.order_id,capture_reference:binding.capture_id,plan_reference:binding.plan_id,link_reference:binding.perksphere_link_uuid||null,event_type:eventType,reversal_reference:reference,currency:'GBP',original_amount_minor:original,amount_minor:individual,reversed_amount_minor:cumulative,occurred_at:new Date(occurred).toISOString()};
}
