import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const sw=await readFile(new URL("../public/sw.js",import.meta.url));
const recoveryPrompt=await readFile(new URL("../src/lib/requestProfilePin.js",import.meta.url));
const server=createServer((req,res)=>{
 if(req.url==='/sw.js'){res.setHeader('Content-Type','application/javascript');res.end(sw);}
 else if(req.url==='/requestProfilePin.js'){res.setHeader('Content-Type','application/javascript');res.end(recoveryPrompt);}
 else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>XeroStreams local worker test</title>');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const profile=await mkdtemp(join(tmpdir(),'xero-chromium-'));
const browser=spawn(process.env.CHROMIUM_BIN || 'chromium',['--headless=new','--no-sandbox','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let announcedPort;
let startupLog='';
browser.stderr.on('data',chunk=>{
 const line=chunk.toString();process.stderr.write(line);
 startupLog=(startupLog+line).slice(-8192);
 const match=startupLog.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
 if(match)announcedPort=match[1];
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
try {
 let port;
 for(let i=0;i<400&&!port;i++){if(browser.exitCode!==null)break;try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{port=announcedPort;if(!port)await sleep(100);}}
 assert.ok(port, 'Chromium did not expose its local debugging port');
 const endpoint=await (await fetch('http://127.0.0.1:'+port+'/json/version')).json();
 ws=new WebSocket(endpoint.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let next=0;
 const callbacks=new Map();
 const registrations=new Map();
 ws.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='ServiceWorker.workerRegistrationUpdated')for(const row of message.params.registrations)registrations.set(row.scopeURL,row.registrationId);
  const callback=callbacks.get(message.id);
  if(!callback)return;
  callbacks.delete(message.id);
  if(message.error)callback.reject(new Error(JSON.stringify(message.error)));else callback.resolve(message.result);
 });
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
  const id=++next;callbacks.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
 });
 const attach=async targetId=>(await call('Target.attachToTarget',{targetId,flatten:true})).sessionId;
 const evaluate=async(sessionId,expression)=>{
  const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
 };
 const target=(await call('Target.createTarget',{url:origin})).targetId;
 const session=await attach(target);
 await call('ServiceWorker.enable',{},session);
 for(let i=0;i<50;i++){if(await evaluate(session,'location.origin')===origin)break;await sleep(100);}
 const promptChecks=await evaluate(session,`(async()=>{
  const { requestProfilePin, cancelProfilePin } = await import('/requestProfilePin.js');
  const first = requestProfilePin('Enter profile PIN');
  const input = document.querySelector('dialog input');
  input.value = '1abc';
  const rejectsInvalidPin = !input.checkValidity();
  const pinMasked = input.type === 'password';
  const concurrent = await requestProfilePin('Duplicate prompt');
  cancelProfilePin();
  const cancelled = await first;
  const recovery = requestProfilePin('Enter recovery code', { recovery: true });
  const code = 'abcdef0123456789'.repeat(2);
  const codeInput = document.querySelector('dialog input');
  codeInput.value = code;
  const acceptsRecoveryCode = codeInput.checkValidity() && codeInput.maxLength === 32 && codeInput.type === 'password';
  codeInput.form.requestSubmit();
  return {
   rejectsInvalidPin, pinMasked, concurrent, cancelled, acceptsRecoveryCode,
   submitted: await recovery === code,
   cleaned: !document.querySelector('dialog') && codeInput.value === ''
  };
 })()`);
 assert.deepEqual(promptChecks,{
  rejectsInvalidPin:true,pinMasked:true,concurrent:null,cancelled:null,
  acceptsRecoveryCode:true,submitted:true,cleaned:true
 });
 console.log('Chromium verified PIN validation, masked recovery code entry, cancellation, and cleanup.');
 await call('Browser.setPermission',{permission:{name:'notifications'},setting:'granted',origin});
 await evaluate(session,'navigator.serviceWorker.register("/sw.js").then(()=>navigator.serviceWorker.ready).then(()=>true)');
 for(let i=0;i<50&&!registrations.has(origin+'/');i++)await sleep(100);
 assert.ok(registrations.has(origin+'/'));
 await call('Page.navigate',{url:'about:blank'},session);
 for(let i=0;i<50;i++){if(await evaluate(session,'location.href')==='about:blank')break;await sleep(100);}
 assert.equal(await evaluate(session,'location.href'),'about:blank');
 const open=await call('Target.getTargets');
 assert.equal(open.targetInfos.filter(t=>t.type==='page'&&t.url.startsWith(origin)).length,0);
 await call('ServiceWorker.deliverPushMessage',{origin,registrationId:registrations.get(origin+'/'),data:JSON.stringify({type:'release',id:'chromium',title:'Private title',link:'https://example.invalid/'})},session);
 await call('Page.navigate',{url:origin},session);
 let notifications=[];
 for(let i=0;i<50;i++){
  if(await evaluate(session,'location.origin')===origin){
   notifications=await evaluate(session,'navigator.serviceWorker.getRegistration().then(reg=>reg.getNotifications()).then(rows=>rows.map(n=>({title:n.title,body:n.body,tag:n.tag,link:n.data.link})))');
   if(notifications.length)break;
  }
  await sleep(100);
 }
 assert.deepEqual(notifications,[{title:'XeroStreams',body:'A release is available. Open XeroStreams to view your alerts.',tag:'xero-chromium',link:'/dashboard'}]);
 console.log('Chromium received a simulated push with no XeroStreams tabs open and displayed only generic release details.');
} finally {
 ws?.close();
 browser.kill('SIGTERM');
 server.close();
 await sleep(700);
 await rm(profile,{recursive:true,force:true,maxRetries:3});
}
