import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
const hex=(a:Uint8Array)=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
async function digest(pin:string,salt:string){
 const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:600000},key,256)));
}
export default async function(req:Request){
try{
 const base=createClientFromRequest(req),u=await base.auth.me().catch(()=>null);
 if(!u)return Response.json({error:'Unauthorized'},{status:401});
 const b=await req.json(),db=base.asServiceRole.entities;
 if(typeof b.profile_id!=='string'||!(await db.ViewingProfile.filter({id:b.profile_id,user_id:u.id}))[0])return Response.json({error:'Invalid profile'},{status:403});
 const scope={profile_id:b.profile_id,user_id:u.id},row=(await db.ProfilePin.filter(scope))[0];
 const profiles=await db.ViewingProfile.filter({user_id:u.id});
 const target=profiles.find(p=>p.id===b.profile_id);
 const kidsExist=profiles.some(p=>p.is_kids);
 if(b.action==='status')return Response.json({enabled:!!row,requires_setup:kidsExist&&!target?.is_kids&&!row});
 if(b.action==='remove'&&kidsExist&&!target?.is_kids)return Response.json({error:'Adult profiles require a PIN while Kids profiles exist'},{status:403});
 if(b.action==='verify'&&kidsExist&&!target?.is_kids&&!row)return Response.json({error:'Adult PIN required'},{status:403});
 if(!['verify','set','remove'].includes(b.action))return Response.json({error:'Unknown action'},{status:400});
 if(row){
 if(Number(row.locked_until)>Date.now())return Response.json({error:'Try again in 15 minutes'},{status:429});
 const valid=typeof b.pin==='string'&&/^\d{4,8}$/.test(b.pin)&&await digest(b.pin,row.salt)===row.digest;
 if(!valid){const failures=(row.failures||0)+1;await db.ProfilePin.update(row.id,{failures:failures>=5?0:failures,locked_until:failures>=5?Date.now()+900000:0});return Response.json({error:'Incorrect PIN'},{status:403});}
 await db.ProfilePin.update(row.id,{failures:0,locked_until:0});
 }
 if(b.action==='verify')return Response.json({ok:true});
 if(b.action==='remove'){if(row)await db.ProfilePin.delete(row.id);return Response.json({ok:true});}
 if(typeof b.new_pin!=='string'||!/^\d{4,8}$/.test(b.new_pin))return Response.json({error:'Choose a 4–8 digit PIN'},{status:400});
 const salt=hex(crypto.getRandomValues(new Uint8Array(32))),data={salt,digest:await digest(b.new_pin,salt),failures:0,locked_until:0};
 if(row)await db.ProfilePin.update(row.id,data);else await db.ProfilePin.create({...scope,...data});
 return Response.json({ok:true});
}catch{return Response.json({error:'PIN service unavailable'},{status:500});}
}