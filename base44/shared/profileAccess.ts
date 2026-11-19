const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const hash=async(token:string)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))));
export async function issueProfileAccess(db:any,userId:string,profileId:string,pinDigest:string){
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 const expires_at=Date.now()+60*60*1000;
 await db.ProfileAccessSession.create({user_id:userId,profile_id:profileId,token_digest:await hash(token),expires_at,pin_digest:pinDigest||''});
 return {token,expires_at};
}
export async function verifyProfileAccess(db:any,userId:string,profileId:string,token:unknown){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return false;
 const rows=await db.ProfileAccessSession.filter({user_id:userId,profile_id:profileId,token_digest:await hash(token)});
 if(rows.length!==1||!Number.isFinite(rows[0].expires_at)||rows[0].expires_at<=Date.now())return false;
 const pins=await db.ProfilePin.filter({user_id:userId,profile_id:profileId});
 return pins.length<=1&&(pins[0]?.digest||'')===(rows[0].pin_digest||'');
}
