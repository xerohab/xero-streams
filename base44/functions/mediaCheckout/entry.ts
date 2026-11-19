import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {secrets} from 'base44:runtime';
import {planPrice} from '../../shared/premiumPayments.ts';
const valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const api=()=>secrets.get('PAYPAL_ENVIRONMENT')==='sandbox'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';
async function request(path,method,token,body,key){
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 if(key)headers['PayPal-Request-Id']=key;
 const r=await fetch(api()+path,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Payment unavailable');return r.json();
}
const queues=new Map();
async function serialize(key,work){
 const previous=queues.get(key)||Promise.resolve();let release;
 const current=new Promise(resolve=>{release=resolve;});queues.set(key,current);
 await previous;try{return await work();}finally{release();if(queues.get(key)===current)queues.delete(key);}
}
async function access(){
 if(!secrets.get('PAYPAL_CLIENT_ID')||!secrets.get('PAYPAL_CLIENT_SECRET'))throw Error('Payment unavailable');
 const r=await fetch(api()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(secrets.get('PAYPAL_CLIENT_ID')+':'+secrets.get('PAYPAL_CLIENT_SECRET')),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Payment unavailable');const data=await r.json();if(typeof data.access_token!=='string'||!data.access_token)throw Error('Payment unavailable');return data.access_token;
}
export default async function(req:Request){
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 try{
 const c=createClientFromRequest(req),u=await c.auth.me().catch(()=>null);
 if(!u?.id||u.is_banned)return Response.json({error:'Unauthorized'},{status:401,headers});
 const b=await req.json(),db=c.asServiceRole.entities;
 if(!b||typeof b!=='object'||Array.isArray(b))throw Error();
 if(b.action==='create'){
 if(!valid(b.item_id)||!['video','book'].includes(b.kind))throw Error();
 const format=b.kind==='video'?'default':b.format;
 if(!['default','word','ebook'].includes(format))throw Error();
 const item=await (b.kind==='video'?db.Video:db.Book).get(b.item_id);
 if(item?.id!==b.item_id||(b.kind==='video'?!item.is_for_sale:item.is_active!==true))throw Error();
 const amount=planPrice(format==='default'?item.price:item['price_'+format]||item.price);
 const key=crypto.randomUUID();
 const binding=await db.MediaPayment.create({user_id:u.id,item_id:item.id,kind:b.kind,format,amount,status:'pending',request_reference:key});
 if(!valid(binding.id))throw Error();
 const order=await request('/v2/checkout/orders','POST',await access(),{intent:'CAPTURE',purchase_units:[{custom_id:'XEROMEDIA:'+binding.id,amount:{currency_code:'GBP',value:amount}}],application_context:{return_url:'https://xerostreams.com/callback?success=true&media=true',cancel_url:'https://xerostreams.com/callback?cancelled=true&media=true',user_action:'PAY_NOW'}},key);
 if(!valid(order.id))throw Error();
 const approval=new URL(order.links?.find(l=>l.rel==='approve')?.href);
 if(approval.protocol!=='https:'||!['www.paypal.com','www.sandbox.paypal.com'].includes(approval.hostname)||approval.username||approval.password)throw Error();
 await db.MediaPayment.update(binding.id,{order_id:order.id,status:'created'});
 return Response.json({orderId:order.id,approvalUrl:approval.href},{headers});
 }
 if(b.action!=='capture'||!valid(b.orderId))throw Error();
 return await serialize(b.orderId,async()=>{
 const rows=await db.MediaPayment.filter({order_id:b.orderId});
 if(rows.length!==1||rows[0].user_id!==u.id)throw Error();
 const binding=rows[0];
 if(!valid(binding.id)||!valid(binding.item_id)||!valid(binding.request_reference)||!['video','book'].includes(binding.kind)||!['default','word','ebook'].includes(binding.format)||(binding.kind==='video'&&binding.format!=='default')||!/^\d+\.\d{2}$/.test(binding.amount)||!['created','completed'].includes(binding.status))throw Error();
 const token=await access(),path='/v2/checkout/orders/'+b.orderId;
 const check=order=>{const unit=order.purchase_units?.[0];if(order.id!==b.orderId||order.purchase_units?.length!==1||unit?.custom_id!=='XEROMEDIA:'+binding.id||unit.amount?.currency_code!=='GBP'||unit.amount?.value!==binding.amount)throw Error();return unit;};
 let order=await request(path,'GET',token);check(order);
 if(order.status==='APPROVED'){await request(path+'/capture','POST',token,{},'capture-'+binding.request_reference);order=await request(path,'GET',token);}
 const captures=check(order).payments?.captures,cap=captures?.[0];
 if(order.status!=='COMPLETED'||captures?.length!==1||cap?.status!=='COMPLETED'||!valid(cap.id)||cap.amount?.currency_code!=='GBP'||cap.amount?.value!==binding.amount)throw Error();
 const video=binding.kind==='video',entity=video?db.VideoPurchase:db.BookPurchase,field=video?'video_id':'book_id';
 const existing=await entity.filter({paypal_order_id:b.orderId});
 if(existing.length>1||existing.some(r=>r.user_id!==u.id||r[field]!==binding.item_id||(!video&&r.format!==binding.format)))throw Error();
 if(binding.capture_id&&binding.capture_id!==cap.id)throw Error();
 const reused=await db.MediaPayment.filter({capture_id:cap.id});
 if(reused.some(row=>row.id!==binding.id))throw Error();
 if(existing.some(row=>row.status!=='completed'))throw Error();
 if(!existing.length)await entity.create({user_id:u.id,[field]:binding.item_id,...(!video?{format:binding.format}:{}),status:'completed',paypal_order_id:b.orderId});
 await db.MediaPayment.update(binding.id,{status:'completed',capture_id:cap.id});
 return Response.json({success:true,kind:binding.kind},{headers});
 });
 }catch{return Response.json({error:'Media payment could not be verified'},{status:409,headers});}
}
