// Operator-only planning helper, never a public linking or reward authorization path.
// A repair requires correlation to the original independently verified consent.
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export function planLegacyLinkReferenceRepair({connection,session,anchor,now=Date.now()}){
 const fail=()=>{throw Error('LEGACY_LINK_REPAIR_NOT_PROVEN');};
 if(!connection||!session||!anchor||!Number.isSafeInteger(now)||connection.status!=='linked'||connection.partner_id!=='xero-streams'||connection.user_id!==session.user_id||session.evidence_version!=='native-playback-v1')fail();
 const previous=connection.perksphere_connection_id,canonical=anchor.canonical_link_reference;
 if(!uuid(previous)||!uuid(canonical)||previous===canonical||session.perksphere_link_uuid!==previous||connection.legacy_link_reference||session.legacy_link_reference)fail();
 for(const key of ['consent_verified','consumed','same_member','same_confirmation','link_never_updated'])if(anchor[key]!==true)fail();
 if(anchor.matching_original_consents!==1)fail();
 const linked=Date.parse(connection.linked_at),created=Date.parse(connection.created_date),updated=Date.parse(connection.updated_date),started=Date.parse(session.started_at),last=Date.parse(session.last_update);
 if(![linked,created,updated,started,last].every(Number.isFinite)||linked>=Date.parse('2026-10-24T00:00:00Z')||created!==updated||Math.abs(linked-created)>1000||started<linked||last<started||last>now+5000)fail();
 const metadata={legacy_link_reference:previous,link_reference_repaired_at:new Date(now).toISOString()};
 return {connection:{perksphere_connection_id:canonical,...metadata},session:{perksphere_link_uuid:canonical,...metadata}};
}
