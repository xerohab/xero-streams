import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
const hex=(a:Uint8Array)=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
function equalDigest(a:string,b:string){
 if(typeof b!=='string'||a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function digest(pin:string,salt:string){
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:600000},key,256)));
}
async function hashCode(code:string,email:string){
 return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code+'\n'+email))));
}
export default async function(req:Request){
try{
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(!u||u.is_banned)return Response.json({error:'Unauthorized'},{status:401});
 const b=await req.json(),db=base.asServiceRole.entities;
 const profiles=await db.ViewingProfile.filter({user_id:u.id});
 if(b.action==='bootstrap'){
  if(profiles.length)return Response.json({profile:profiles.find(p=>p.is_default)||profiles[0]});
  const name=(typeof u.full_name==='string'&&u.full_name.trim().slice(0,30))||'Main Profile';
  const profile=await db.ViewingProfile.create({user_id:u.id,name,avatar:'popcorn',is_default:true,is_kids:false});
  return Response.json({profile});
 }
 const target=profiles.find(p=>p.id===b.profile_id);
 if(!target)return Response.json({error:'Invalid profile'},{status:403});
 const scope={profile_id:b.profile_id,user_id:u.id},row=(await db.ProfilePin.filter(scope))[0];
 const kidsExist=profiles.some(p=>p.is_kids);
 const management=['create_profile','delete_profile','edit_profile'].includes(b.action);
 if(management&&(target.is_kids||(kidsExist&&!row?.digest)))return Response.json({error:'Adult PIN required'},{status:403});
 const affected=profiles.find(p=>p.id===b.target_id);
 if(b.action==='touch'){
  await db.ViewingProfile.update(target.id,{last_used_date:new Date().toISOString()});
  return Response.json({ok:true});
 }
 if(b.action==='favourites'){
  const data:Record<string,string[]>={};
  for(const key of ['favourites','favourite_series','favourite_franchises']){
   const values=b.data?.[key];
   if(values===undefined)continue;
   if(!Array.isArray(values)||values.length>5000||values.some(v=>typeof v!=='string'||!v||v.length>256))return Response.json({error:'Invalid favourites'},{status:400});
   data[key]=values;
  }
  const profile=await db.ViewingProfile.update(target.id,data);
  return Response.json({profile});
 }
 if(b.action==='request_recovery'||b.action==='recover'){
  if(typeof u.email!=='string'||!u.email||u.email_verified===false)return Response.json({error:'Account email is unavailable'},{status:403});
  const now=Date.now(),email=u.email.toLowerCase();
  if(b.action==='request_recovery'){
   if(row?.recovery_expires_at>now)return Response.json({error:'Use the current code or wait 15 minutes before requesting another'},{status:429});
   if(typeof b.new_pin!=='string'||!/^\d{4,8}$/.test(b.new_pin))return Response.json({error:'Choose a 4–8 digit PIN'},{status:400});
   const code=hex(crypto.getRandomValues(new Uint8Array(16)));
   const recovery_salt=hex(crypto.getRandomValues(new Uint8Array(32)));
   const recovery={
    recovery_digest:await hashCode(code,email),
    recovery_expires_at:now+900000,
    recovery_salt,
    recovery_pin_digest:await digest(b.new_pin,recovery_salt)
   };
   if(row)await db.ProfilePin.update(row.id,recovery);
   else await db.ProfilePin.create({...scope,salt:'',digest:'',...recovery});
   try{
    await base.asServiceRole.integrations.Core.SendEmail({
     to:u.email,subject:'XeroStreams profile PIN recovery',from_name:'XeroStreams',
     body:'Enter this code on the XeroStreams profile selection page: '+code+'\n\nThe code expires in 15 minutes. Ignore this email if you did not request it.'
    });
   }catch{
    const pending=(await db.ProfilePin.filter(scope))[0];
    if(pending?.recovery_digest===recovery.recovery_digest){
     await db.ProfilePin.update(pending.id,{recovery_digest:'',recovery_expires_at:0,recovery_salt:'',recovery_pin_digest:''});
    }
    return Response.json({error:'Could not send the recovery email. Try again.'},{status:503});
   }
   return Response.json({ok:true});
  }
  if(!row||!(row.recovery_expires_at>now)||typeof b.code!=='string'||!/^([a-f0-9]{32})$/.test(b.code)||
     !equalDigest(await hashCode(b.code,email),row.recovery_digest))return Response.json({error:'Invalid or expired recovery code'},{status:403});
  const current=(await db.ProfilePin.filter(scope))[0];
  if(current?.id!==row.id||current.recovery_digest!==row.recovery_digest||!(current.recovery_expires_at>Date.now())||!current.recovery_salt||!current.recovery_pin_digest)return Response.json({error:'Invalid or expired recovery code'},{status:403});
  await db.ProfilePin.update(row.id,{salt:current.recovery_salt,digest:current.recovery_pin_digest,failures:0,locked_until:0,recovery_digest:'',recovery_expires_at:0,recovery_salt:'',recovery_pin_digest:''});
  return Response.json({ok:true});
 }
 const enabled=!!row?.digest;
 if(b.action==='status')return Response.json({enabled,requires_setup:kidsExist&&!target?.is_kids&&!enabled});
 if(b.action==='remove'&&kidsExist&&!target?.is_kids)return Response.json({error:'Adult profiles require a PIN while Kids profiles exist'},{status:403});
 if(b.action==='set'&&kidsExist&&!target?.is_kids&&!enabled)return Response.json({error:'Account recovery required before setting a missing adult PIN'},{status:403});
 if(b.action==='verify'&&kidsExist&&!target?.is_kids&&!enabled)return Response.json({error:'Adult PIN required'},{status:403});
 if(b.action==='verify'&&target.is_kids){
  const adults=profiles.filter(profile=>!profile.is_kids);
  const pins=await db.ProfilePin.filter({user_id:u.id});
  if(!adults.length||adults.some(adult=>!pins.some(pin=>pin.profile_id===adult.id&&pin.digest))){
   return Response.json({error:'Set a PIN on every adult profile before entering Kids mode'},{status:403});
  }
 }
 if(!management&&!['verify','set','remove'].includes(b.action))return Response.json({error:'Unknown action'},{status:400});
 if(b.action==='set'&&(typeof b.new_pin!=='string'||!/^\d{4,8}$/.test(b.new_pin)))return Response.json({error:'Choose a 4–8 digit PIN'},{status:400});
 if(enabled){
  if(Number(row.locked_until)>Date.now())return Response.json({error:'Try again in 15 minutes'},{status:429});
  const {id,salt,digest:expectedDigest}=row;
  const valid=typeof b.pin==='string'&&/^\d{4,8}$/.test(b.pin)&&equalDigest(await digest(b.pin,salt),expectedDigest);
  const current=(await db.ProfilePin.filter(scope))[0];
  if(!current||current.id!==id||current.salt!==salt||current.digest!==expectedDigest){
   return Response.json({error:'PIN changed. Try again.'},{status:409});
  }
  if(Number(current.locked_until)>Date.now())return Response.json({error:'Try again in 15 minutes'},{status:429});
  if(!valid){
   const failures=(current.failures||0)+1;
   await db.ProfilePin.update(id,{failures:failures>=5?0:failures,locked_until:failures>=5?Date.now()+900000:0});
   return Response.json({error:'Incorrect PIN'},{status:403});
  }
  if(current.failures||current.locked_until)await db.ProfilePin.update(id,{failures:0,locked_until:0});
 }
 if(management){
  if(b.action==='delete_profile'){
   if(!affected||(!affected.is_kids&&profiles.filter(p=>!p.is_kids).length<=1))return Response.json({error:'Cannot delete profile'},{status:403});
   await db.ViewingProfile.delete(affected.id);
   return Response.json({ok:true});
  }
  const {name,avatar,accent_color,is_kids}=b.data||{};
  if(typeof name!=='string'||!name.trim()||name.length>30||typeof avatar!=='string'||!avatar||avatar.length>256||
    (accent_color!=null&&(typeof accent_color!=='string'||accent_color.length>32)))return Response.json({error:'Invalid profile details'},{status:400});
  const data={name:name.trim(),avatar,accent_color:accent_color??null};
  if(b.action==='edit_profile'){
   if(!affected)return Response.json({error:'Invalid profile'},{status:403});
   return Response.json({profile:await db.ViewingProfile.update(affected.id,data)});
  }
  if(profiles.length>=5||typeof is_kids!=='boolean'||(!is_kids&&kidsExist))return Response.json({error:'Cannot add profile'},{status:403});
  if(is_kids){
   const pins=await db.ProfilePin.filter({user_id:u.id});
   if(profiles.some(p=>!p.is_kids&&!pins.some(pin=>pin.profile_id===p.id&&pin.digest)))return Response.json({error:'Set a PIN on every adult profile first'},{status:403});
  }
  const profile=await db.ViewingProfile.create({...data,user_id:u.id,is_kids,is_default:false});
  return Response.json({profile});
 }
 if(b.action==='verify')return Response.json({ok:true});
 if(b.action==='remove'){if(row)await db.ProfilePin.delete(row.id);return Response.json({ok:true});}
 if(typeof b.new_pin!=='string'||!/^\d{4,8}$/.test(b.new_pin))return Response.json({error:'Choose a 4–8 digit PIN'},{status:400});
 const salt=hex(crypto.getRandomValues(new Uint8Array(32))),data={salt,digest:await digest(b.new_pin,salt),failures:0,locked_until:0,recovery_digest:'',recovery_expires_at:0,recovery_salt:'',recovery_pin_digest:''};
 if(row)await db.ProfilePin.update(row.id,data);else await db.ProfilePin.create({...scope,...data});
 return Response.json({ok:true});
}catch{return Response.json({error:'PIN service unavailable'},{status:500});}
}