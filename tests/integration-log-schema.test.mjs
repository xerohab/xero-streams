import test from 'node:test';
import assert from 'node:assert/strict';
import {logIntegration} from '../base44/shared/perkSphereClient.ts';
test('integration diagnostics follow the existing status/string schema and exclude unrelated fields',async()=>{
 const rows=[],client={asServiceRole:{entities:{IntegrationLog:{create:async row=>rows.push(row)}}}};
 await logIntegration(client,{event_type:'purchase_refunded',status:'submitted',details:{operator_reference:'operator',provider_verified:true,reward_reversal_applied:false},user_id:'member',credential:'MUST NOT COPY'});
 assert.equal(rows[0].status,'pending');assert.equal(typeof rows[0].details,'string');assert.equal(JSON.parse(rows[0].details).provider_verified,true);assert.equal(JSON.stringify(rows).includes('MUST NOT COPY'),false);
 await logIntegration(client,{event_type:'purchase_refunded',status:'failed',details:'Provider unavailable'});assert.equal(rows[1].status,'error');
});
