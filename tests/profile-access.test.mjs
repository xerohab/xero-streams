import test from 'node:test';
import assert from 'node:assert/strict';
import {issueProfileAccess,verifyProfileAccess} from '../base44/shared/profileAccess.ts';
test('access grants are hashed, scoped, expiring and invalidated by PIN changes',async()=>{
 const rows=[];let digest='pin-a';
 const db={ProfileAccessSession:{create:async r=>rows.push(r),filter:async q=>rows.filter(r=>Object.entries(q).every(([k,v])=>r[k]===v))},ProfilePin:{filter:async()=>[{digest}]}};
 const {token}=await issueProfileAccess(db,'u','p',digest);
 assert.notEqual(rows[0].token_digest,token);
 assert.equal(await verifyProfileAccess(db,'u','p',token),true);
 assert.equal(await verifyProfileAccess(db,'other','p',token),false);
 assert.equal(await verifyProfileAccess(db,'u','other',token),false);
 digest='pin-b';assert.equal(await verifyProfileAccess(db,'u','p',token),false);
 digest='pin-a';rows[0].expires_at=0;assert.equal(await verifyProfileAccess(db,'u','p',token),false);
});
