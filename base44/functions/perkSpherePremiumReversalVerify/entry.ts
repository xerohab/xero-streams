import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {secrets} from 'base44:runtime';
import {getCredentials,validateKeyForPartner} from '../../shared/perkSphereClient.ts';
import {verifyPremiumReversal} from '../../shared/premiumPayments.ts';
import {createPremiumReversalSource} from '../../shared/premiumReversalSource.ts';
const handler=createPremiumReversalSource({
 partnerUuid:'630feee8-2649-4c4f-b2a0-c26746a696fd',
 enabled:()=>secrets.get('PERKSPHERE_REVERSAL_SOURCE_ENABLED')==='true'&&validateKeyForPartner('xero-streams').valid,
 getCredentials,
 loadProof:async(account,order,eventType,reference,req)=>{
  const admin=createClientFromRequest(req).asServiceRole;
  const user=await admin.entities.User.get(account);
  if(user?.id!==account)throw Error('ACCOUNT_UNAVAILABLE');
  return verifyPremiumReversal(admin,account,order,eventType,reference);
 }
});
export default handler;
if(typeof Deno!=='undefined')Deno.serve(handler);
