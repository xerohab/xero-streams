import test from 'node:test';
import assert from 'node:assert/strict';
import {premiumReversalProof,paymentMinor} from '../base44/shared/premiumReversals.ts';
const now=Date.parse('2026-10-25T13:00:00Z'),captured='2026-10-24T12:00:00Z';
function fixture(){
 const binding={id:'receipt',user_id:'member',plan_id:'plan',order_id:'ORDER',capture_id:'CAPTURE',captured_at:captured,status:'completed',currency:'GBP',expected_amount:'4.99'};
 const capture={id:'CAPTURE',status:'PARTIALLY_REFUNDED',amount:{currency_code:'GBP',value:'4.99'},supplementary_data:{related_ids:{order_id:'ORDER'}}};
 const order={id:'ORDER',status:'COMPLETED',purchase_units:[{custom_id:'PSPREMIUM:receipt',amount:{currency_code:'GBP',value:'4.99'},payments:{captures:[{...capture,create_time:captured}]}}]};
 const refund={id:'REFUND',status:'COMPLETED',amount:{currency_code:'GBP',value:'1.00'},seller_payable_breakdown:{total_refunded_amount:{currency_code:'GBP',value:'2.00'}},update_time:'2026-10-25T12:00:00Z',links:[{rel:'up',method:'GET',href:'https://api-m.paypal.com/v2/payments/captures/CAPTURE'}]};
 const dispute={dispute_id:'DISPUTE',status:'RESOLVED',dispute_channel:'EXTERNAL',dispute_life_cycle_stage:'CHARGEBACK',disputed_transactions:[{seller_transaction_id:'CAPTURE',gross_amount:{currency_code:'GBP',value:'4.99'}}],dispute_outcome:{outcome_code:'RESOLVED_BUYER_FAVOUR',amount_refunded:{currency_code:'GBP',value:'4.99'}},update_time:'2026-10-25T12:00:00Z'};
 const calls=[],read=async path=>{calls.push(path);if(path==='/v2/payments/captures/CAPTURE')return capture;if(path==='/v2/payments/refunds/REFUND')return refund;if(path==='/v1/customer/disputes/DISPUTE')return dispute;throw Error('unexpected provider path');};
 return {binding,capture,order,refund,dispute,calls,read};
}
const args=f=>({...f,eventType:'purchase_refunded',reference:'REFUND',now});
test('refund proof binds exact order/capture and reports provider cumulative totals without browser amounts',async()=>{
 const f=fixture(),p=await premiumReversalProof(args(f));assert.equal(p.original_amount_minor,499);assert.equal(p.amount_minor,100);assert.equal(p.reversed_amount_minor,200);assert.deepEqual(f.calls,['/v2/payments/captures/CAPTURE','/v2/payments/refunds/REFUND']);assert.equal(p.partner_account_reference,'member');
});
test('definitive fully refunded capture caps an older partial refund at the original total',async()=>{
 const f=fixture();f.capture.status='REFUNDED';assert.equal((await premiumReversalProof(args(f))).reversed_amount_minor,499);
});
test('refund proof rejects wrong ownership, currency, capture links, status, cumulative totals and clocks',async()=>{
 for(const change of ['order','capture','currency','pending','foreign_url','wrong_parent','total','clock']){
  const f=fixture();
  if(change==='order')f.order.purchase_units[0].custom_id='PSPREMIUM:other';
  if(change==='capture')f.capture.supplementary_data.related_ids.order_id='OTHER';
  if(change==='currency')f.refund.amount.currency_code='USD';
  if(change==='pending')f.refund.status='PENDING';
  if(change==='foreign_url')f.refund.links[0].href='https://evil.test/v2/payments/captures/CAPTURE';
  if(change==='wrong_parent')f.refund.links[0].href='https://api-m.paypal.com/v2/payments/captures/OTHER';
  if(change==='total')f.refund.seller_payable_breakdown.total_refunded_amount.value='5.00';
  if(change==='clock')f.refund.update_time='2027-01-01T00:00:00Z';
  await assert.rejects(premiumReversalProof(args(f)),undefined,change);
 }
});
test('only a resolved full buyer-favour external chargeback proves a full reversal',async()=>{
 const f=fixture(),p=await premiumReversalProof({...args(f),eventType:'chargeback_issued',reference:'DISPUTE'});assert.equal(p.reversed_amount_minor,499);
 for(const change of ['pending','internal','partial','seller','foreign_capture']){
  const g=fixture();
  if(change==='pending')g.dispute.status='UNDER_REVIEW';
  if(change==='internal')g.dispute.dispute_channel='INTERNAL';
  if(change==='partial')g.dispute.dispute_outcome.amount_refunded.value='1.00';
  if(change==='seller')g.dispute.dispute_outcome.outcome_code='RESOLVED_SELLER_FAVOUR';
  if(change==='foreign_capture')g.dispute.disputed_transactions[0].seller_transaction_id='OTHER';
  await assert.rejects(premiumReversalProof({...args(g),eventType:'chargeback_issued',reference:'DISPUTE'}),undefined,change);
 }
});
test('provider failure and malformed monetary values cannot yield reversal evidence',async()=>{
 const f=fixture();await assert.rejects(premiumReversalProof({...args(f),read:async()=>{throw Error('provider unavailable');}}));
 for(const value of ['0.00','1.001','1e2','-1.00','100000.01',4.99])assert.throws(()=>paymentMinor({currency_code:'GBP',value}));
});
