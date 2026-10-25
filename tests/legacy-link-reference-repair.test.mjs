import test from 'node:test';
import assert from 'node:assert/strict';
import {planLegacyLinkReferenceRepair} from '../base44/shared/legacyLinkReferenceRepair.ts';
const old='11111111-1111-4111-8111-111111111111',canonical='22222222-2222-4222-8222-222222222222';
function fixture(){return {now:Date.parse('2026-10-25T12:00:00Z'),connection:{user_id:'owner',partner_id:'xero-streams',status:'linked',perksphere_connection_id:old,linked_at:'2026-10-10T13:00:00.000Z',created_date:'2026-10-10T13:00:00.000Z',updated_date:'2026-10-10T13:00:00.000Z'},session:{user_id:'owner',evidence_version:'native-playback-v1',perksphere_link_uuid:old,started_at:'2026-10-25T11:00:00Z',last_update:'2026-10-25T11:07:00Z',accumulated_watch_seconds:376},anchor:{canonical_link_reference:canonical,matching_original_consents:1,consent_verified:true,consumed:true,same_member:true,same_confirmation:true,link_never_updated:true}};}
test('only the proven legacy reference changes; ownership and recorded playback are preserved',()=>{
 const f=fixture(),patch=planLegacyLinkReferenceRepair(f);
 assert.equal(patch.connection.perksphere_connection_id,canonical);assert.equal(patch.session.perksphere_link_uuid,canonical);
 assert.equal(patch.connection.legacy_link_reference,old);assert.equal(patch.session.legacy_link_reference,old);
 for(const data of Object.values(patch))for(const field of ['user_id','status','credited_ranges','accumulated_watch_seconds','points','xp'])assert.equal(data[field],undefined);
 assert.equal(f.session.accumulated_watch_seconds,376);
});
test('missing, ambiguous, transferred or replaced consent prevents a legacy reference repair',()=>{
 for(const key of ['consent_verified','consumed','same_member','same_confirmation','link_never_updated']){
  const f=fixture();f.anchor[key]=false;assert.throws(()=>planLegacyLinkReferenceRepair(f),/NOT_PROVEN/);
 }
 for(const change of ['ambiguous','owner','session','new_link','updated','already_repaired']){
  const f=fixture();
  if(change==='ambiguous')f.anchor.matching_original_consents=2;
  if(change==='owner')f.session.user_id='other';
  if(change==='session')f.session.perksphere_link_uuid=canonical;
  if(change==='new_link')f.connection.linked_at='2026-10-25T10:00:00Z';
  if(change==='updated')f.connection.updated_date='2026-10-11T13:00:00.000Z';
  if(change==='already_repaired')f.connection.legacy_link_reference=old;
  assert.throws(()=>planLegacyLinkReferenceRepair(f),/NOT_PROVEN/,change);
 }
});
