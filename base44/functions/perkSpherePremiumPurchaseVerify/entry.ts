import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {secrets} from 'base44:runtime';
import {getCredentials,validateKeyForPartner} from '../../shared/perkSphereClient.ts';
import {verifyPremiumPayment} from '../../shared/premiumPayments.ts';
import {createPremiumPurchaseSource} from '../../shared/premiumPurchaseSource.ts';
const handler=createPremiumPurchaseSource({
 partnerUuid:'630feee8-2649-4c4f-b2a0-c26746a696fd',
 enabled:()=>secrets.get('PERKSPHERE_PURCHASE_SOURCE_ENABLED')==='true'&&validateKeyForPartner('xero-streams').valid,
 getCredentials,
 loadProof:async(account,order,req)=>{
  const admin=createClientFromRequest(req).asServiceRole;
  const user=await admin.entities.User.get(account);
  if(!user||user.id!==account||['suspended','banned','disabled'].includes(user.account_status))throw Error('ACCOUNT_UNAVAILABLE');
  return verifyPremiumPayment(admin,account,order);
 }
});
export default handler;
if(typeof Deno!=='undefined')Deno.serve(handler);
