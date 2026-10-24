import test from 'node:test';
import assert from 'node:assert/strict';
test('changed reward entrypoints register one callable server without account or network activity',async()=>{
 const previousDeno=globalThis.Deno,previousFetch=globalThis.fetch;
 try{
  globalThis.fetch=()=>{throw Error('Entry registration must not perform network I/O');};
  for(const name of ['premiumCheckout','partnerTrackViewing','perkSpherePremiumPurchaseVerify','perkSphereNativePlaybackVerify']){
   const registrations=[];globalThis.Deno={serve:handler=>registrations.push(handler)};
   const module=await import('../base44/functions/'+name+'/entry.ts?startup-check');
   assert.equal(registrations.length,1,name);assert.equal(typeof registrations[0],'function');assert.equal(module.default,registrations[0]);
  }
 }finally{
  if(previousDeno===undefined)delete globalThis.Deno;else globalThis.Deno=previousDeno;
  globalThis.fetch=previousFetch;
 }
});
