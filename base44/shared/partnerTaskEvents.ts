import {secrets} from 'base44:runtime';
import {submitPartnerEvent,currentPerkSphereLink} from './perkSphereClient.ts';
const PREMIUM_TASK='6add18607277b6ca86efab42';
export function playbackTaskBindings(policy){
 const rows=policy.task_bindings||[];
 if(!Array.isArray(rows)||rows.length>20||rows.some(row=>!row||! /^[a-f0-9]{24}$/.test(row.task_reference||'')||!Number.isSafeInteger(row.required_seconds)||row.required_seconds<1||row.required_seconds>policy.duration_seconds||typeof row.full_content!=='boolean'||row.full_content&&row.required_seconds!==policy.duration_seconds)||new Set(rows.map(row=>row.task_reference)).size!==rows.length)throw Error('INVALID_PLAYBACK_TASK_BINDINGS');
 return rows;
}
export async function emitNativeTaskEvents(admin,{connection,session,policy,videoId,eligibleSeconds,fullContent,occurredAt}){
 if(secrets.get('PERKSPHERE_VIDEO_EVENTS_ENABLED')!=='true'||!connection||!policy||connection.perksphere_connection_id!==session.perksphere_link_uuid)return [];
 const submitted=new Set(session.task_submissions||[]),events=[];let attempts=0;
 for(const binding of playbackTaskBindings(policy)){
  if(submitted.has(binding.task_reference)||eligibleSeconds<binding.required_seconds||binding.full_content&&!fullContent)continue;
  if(attempts++>=3)break;
  try{
   const result=await submitPartnerEvent(connection,{event_type:'video_watch_progress',partner_event_id:'ps_task_'+binding.task_reference+'_'+session.session_id,task_reference:binding.task_reference,resource_reference:videoId,occurred_at:occurredAt,evidence:{content_id:videoId,playback_session_id:session.session_id,eligible_seconds:binding.required_seconds}});
   if(result.ok){submitted.add(binding.task_reference);events.push({task_reference:binding.task_reference,event_type:'video_watch_progress'});}
  }catch{/* A delivery failure does not undo metering; later reports retry. */}
 }
 if(events.length)await admin.entities.ViewingSession.update(session.id,{task_submissions:[...submitted]});
 return events;
}
export async function emitPremiumTaskEvent(admin,proof){
 if(secrets.get('PERKSPHERE_PREMIUM_EVENTS_ENABLED')!=='true')return {submitted:false,reason:'notifications_paused'};
 if(proof.environment!=='live')return {submitted:false,reason:'live_provider_payment_required'};
 const connection=await currentPerkSphereLink(admin,proof.partner_account_reference);
 if(!connection||!proof.link_reference||proof.link_reference!==connection.perksphere_connection_id)return {submitted:false,reason:'original_partner_link_required'};
 const result=await submitPartnerEvent(connection,{event_type:'purchase_completed',partner_event_id:'ps_premium_'+proof.capture_reference,task_reference:PREMIUM_TASK,resource_reference:proof.plan_reference,occurred_at:proof.captured_at,evidence:{transaction_reference:proof.order_reference,payment_status:'captured',currency:proof.currency,amount_minor:proof.amount_minor}});
 return {submitted:result.ok,reward_issued:false};
}
