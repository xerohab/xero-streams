import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('client drops stale profile writes even after switching back',async()=>{
 const storage=new Map(),calls=[];
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 globalThis.window={dispatchEvent(){}};
 globalThis.__playbackTestClient={functions:{invoke:async(name,b)=>{calls.push(b);return {data:{ok:true,rows:[]}};}}};
 const source=(await readFile(new URL('../src/hooks/useContinueWatching.js',import.meta.url),'utf8')).replace('import {base44} from "@/api/base44Client";','const base44=globalThis.__playbackTestClient;');
 const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const select=id=>{localStorage.setItem('xero_active_profile',id);m.setPlaybackProfile(id);};
 select('a');m.saveProgress({id:'v'},20,100,'a');select('b');m.saveProgress({id:'wrong'},20,100,'a');assert.equal(m.getAll().length,0);select('a');await m.syncPlayback('a');assert.equal(calls.filter(b=>b.action==='save').length,0);
 m.saveProgress({id:'v'},30,100,'a');await m.syncPlayback('a');assert.equal(calls.filter(b=>b.action==='save').length,1);
 m.addWatched('v','a');assert.equal(m.getAll().length,0);assert.deepEqual(m.getWatched(),['v']);await m.syncPlayback('a');
});
