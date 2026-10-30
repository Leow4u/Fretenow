import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { MemoryStore } from '../src/store.ts';

const draft = () => ({mode:'LTL',origin:{name:'Demo warehouse',address:'120 Main St',city:'Austin',state:'TX',postalCode:'78701',country:'US'},destination:{name:'Demo destination',address:'210 Broad St',city:'Denver',state:'CO',postalCode:'80202',country:'US'},pickupDate:'2026-11-02',items:[{description:'Pallet',quantity:1,weightLb:100,lengthIn:48,widthIn:40,heightIn:36}],accessorials:[]});
async function setup() {
 let now = Date.parse('2026-10-30T12:00:00Z');
 const store = new MemoryStore();
 const app = createApp({store,mode:'demo',clock:()=>new Date(now)});
 await store.createSession('token-a',{tenantId:'org-a',expiresAt:new Date(now+3600000).toISOString()});
 await store.createSession('token-b',{tenantId:'org-b',expiresAt:new Date(now+3600000).toISOString()});
 const headers = {authorization:'Bearer token-a'};
 const quote = async (value = draft()) => (await app.inject({method:'POST',url:'/api/v1/rates',headers,payload:value})).json();
 const book = async (rateId:string,key='booking-1',value=draft(),extra={}) => app.inject({method:'POST',url:'/api/v1/shipments',headers:{...headers,'idempotency-key':key},payload:{rateId,draft:value,...extra}});
 return {app,store,headers,quote,book,advance:(ms:number)=>{now+=ms;}};
}
test('authentication, tenant isolation and server-owned fields',async t=>{
 const s=await setup();t.after(()=>s.app.close());
 assert.equal((await s.app.inject('/api/v1/shipments')).statusCode,401);
 for(const id of ['constructor','toString','__proto__']) assert.equal((await s.app.inject({url:`/api/v1/shipments/${id}`,headers:s.headers})).statusCode,404);
 const rate=(await s.quote()).rates[0];
 const response=await s.book(rate.id,'one',draft(),{tenantId:'org-b',amountMinor:1,status:'delivered'});
 assert.equal(response.statusCode,201);const shipment=response.json();
 assert.equal(shipment.amountMinor,rate.amountMinor);assert.equal(shipment.status,'booked');
 for(const suffix of ['', '/events']) assert.equal((await s.app.inject({url:`/api/v1/shipments/${shipment.id}${suffix}`,headers:{authorization:'Bearer token-b'}})).statusCode,404);
 assert.equal((await s.app.inject({method:'POST',url:'/api/v1/shipments',headers:{authorization:'Bearer token-b','idempotency-key':'cross'},payload:{rateId:rate.id,draft:draft()}})).statusCode,404);
});
test('concurrent booking and retries return one ID; changed payload conflicts',async t=>{
 const s=await setup();t.after(()=>s.app.close());const rate=(await s.quote()).rates[0];
 const responses=await Promise.all(Array.from({length:12},()=>s.book(rate.id)));
 assert.ok(responses.every(r=>r.statusCode===201||r.statusCode===200));
 assert.equal(new Set(responses.map(r=>r.json().id)).size,1);
 assert.equal((await s.app.inject({url:'/api/v1/shipments',headers:s.headers})).json().shipments.length,1);
 const altered=draft();altered.items[0].weightLb=120;
 assert.equal((await s.book(rate.id,'booking-1',altered)).statusCode,409);
 s.advance(20*60000);assert.equal((await s.book(rate.id)).json().id,responses[0].json().id);
});
test('expired rate and modified item/address cannot book',async t=>{
 const s=await setup();t.after(()=>s.app.close());const rate=(await s.quote()).rates[0];
 for(const change of ['item','address']) {const value=draft();if(change==='item')value.items[0].weightLb=200;else value.destination.address='999 Changed St';assert.equal((await s.book(rate.id,change,value)).statusCode,409);}
 s.advance(16*60000);assert.equal((await s.book(rate.id)).statusCode,409);
});
test('persisted idempotency replays remain valid after the pickup date',async t=>{
 const s=await setup();t.after(()=>s.app.close());
 await s.store.createSession('token-a',{tenantId:'org-a',expiresAt:'2027-10-30T12:00:00Z'});
 const rate=(await s.quote()).rates[0];const booked=(await s.book(rate.id)).json();
 const payload={type:'reschedule',pickupDate:'2026-11-03'};
 const action=()=>s.app.inject({method:'POST',url:`/api/v1/shipments/${booked.id}/actions`,headers:{...s.headers,'idempotency-key':'historic-action'},payload});
 const rescheduled=await action();assert.equal(rescheduled.statusCode,200);
 s.advance(8*86400000);
 const replay=await s.book(rate.id);assert.equal(replay.statusCode,200);assert.equal(replay.json().id,booked.id);
 assert.deepEqual((await action()).json(),rescheduled.json());
});
test('server validation rejects invalid cargo, dates and addresses',async t=>{
 const s=await setup();t.after(()=>s.app.close());
 for(const mutate of [(d:any)=>d.items[0].weightLb=-1,(d:any)=>d.items[0].quantity=0,(d:any)=>d.items[0].widthIn=Infinity,(d:any)=>d.items[0].heightIn=NaN,(d:any)=>d.pickupDate='2026-02-30',(d:any)=>d.origin.postalCode='787',(d:any)=>d.destination.state='XX',(d:any)=>d.origin.address='']) {const value=draft();mutate(value);assert.equal((await s.app.inject({method:'POST',url:'/api/v1/rates',headers:s.headers,payload:value})).statusCode,400);}
});
test('freight mode accepts only enum strings and preserves mode-specific pricing',async t=>{
 const s=await setup();t.after(()=>s.app.close());
 for(const mode of [['FTL'],['LTL'],{value:'FTL'},null]) {
  const response=await s.app.inject({method:'POST',url:'/api/v1/rates',headers:s.headers,payload:{...draft(),mode}});
  assert.equal(response.statusCode,400,`invalid mode ${JSON.stringify(mode)}`);
  assert.equal(response.json().error.code,'VALIDATION');
 }
 for(const [mode,expectedMinor] of [['LTL',16700],['FTL',96700],['Expedited',61700]] as const) {
  const response=await s.app.inject({method:'POST',url:'/api/v1/rates',headers:s.headers,payload:{...draft(),mode}});
  assert.equal(response.statusCode,200);const rate=response.json().rates[0];assert.equal(rate.amountMinor,expectedMinor);
  const booked=await s.app.inject({method:'POST',url:'/api/v1/shipments',headers:{...s.headers,'idempotency-key':`mode-${mode}`},payload:{rateId:rate.id,draft:{...draft(),mode}}});
  assert.equal(booked.statusCode,201);assert.equal(booked.json().mode,mode);assert.equal(booked.json().amountMinor,expectedMinor);
 }
});
test('reschedule and cancel produce audit events and guarded transitions',async t=>{
 const s=await setup();t.after(()=>s.app.close());const shipment=(await s.book((await s.quote()).rates[0].id)).json();
 const action=(payload:object,key:string)=>s.app.inject({method:'POST',url:`/api/v1/shipments/${shipment.id}/actions`,headers:{...s.headers,'idempotency-key':key},payload});
 const moved=await action({type:'reschedule',pickupDate:'2026-11-04'},'move');assert.equal(moved.statusCode,200);assert.equal(moved.json().pickupDate,'2026-11-04');assert.equal(moved.json().events.length,2);
 assert.equal((await action({type:'cancel'},'cancel')).json().status,'cancelled');assert.equal((await action({type:'cancel'},'cancel')).statusCode,200);
 assert.equal((await action({type:'reschedule',pickupDate:'2026-11-05'},'late')).statusCode,409);
});
test('actions reject other tenants, changed keys and in-transit/delivered transitions',async t=>{
 const s=await setup();t.after(()=>s.app.close());const shipment=(await s.book((await s.quote()).rates[0].id)).json();
 const action=(payload:object,key:string,authorization='Bearer token-a')=>s.app.inject({method:'POST',url:`/api/v1/shipments/${shipment.id}/actions`,headers:{authorization,'idempotency-key':key},payload});
 assert.equal((await action({type:'cancel'},'foreign','Bearer token-b')).statusCode,404);
 assert.equal((await action({type:'reschedule',pickupDate:'2026-11-04'},'same')).statusCode,200);
 assert.equal((await action({type:'cancel'},'same')).statusCode,409);
 for(const status of ['in_transit','delivered'] as const){await s.store.transaction('org-a',state=>{state.shipments[shipment.id].status=status;});assert.equal((await action({type:'cancel'},status)).statusCode,409);}
});
test('body errors are bounded JSON and missing capabilities fail explicitly',async t=>{
 const s=await setup();t.after(()=>s.app.close());
 const large=await s.app.inject({method:'POST',url:'/api/v1/rates',headers:{...s.headers,'content-type':'application/json'},payload:JSON.stringify({large:'x'.repeat(70000)})});
 assert.equal(large.statusCode,413);assert.equal(typeof large.json().error.code,'string');assert.equal(large.json().stack,undefined);
 for(const route of ['payments','payments/credit','credit','shipments/x/send']) assert.equal((await s.app.inject({method:'POST',url:`/api/v1/${route}`,headers:s.headers,payload:{}})).statusCode,501);
 const invalid=await s.app.inject({method:'POST',url:'/api/v1/rates',headers:{...s.headers,'content-type':'application/json'},payload:'{"x":NaN}'});assert.equal(invalid.statusCode,400);
 const snapshot=await s.app.inject({url:'/api/v1/snapshot',headers:s.headers});assert.equal(snapshot.json().account.organizationId,'org-a');assert.equal(snapshot.json().demo,true);
});
test('cookie CSRF guard, signout, expiry and production demo protection',async t=>{
 const s=await setup();t.after(()=>s.app.close());
 const session=await s.app.inject({method:'POST',url:'/api/demo/session',headers:{origin:'http://127.0.0.1:3000'}});assert.equal(session.statusCode,201);
 const cookie=String(session.headers['set-cookie']).split(';')[0];assert.match(String(session.headers['set-cookie']),/HttpOnly/);
 for(const origin of [undefined,'https://evil.example','http://localhost:9000']) assert.equal((await s.app.inject({method:'POST',url:'/api/v1/rates',headers:{cookie,...(origin?{origin}:{})},payload:draft()})).statusCode,403);
 assert.equal((await s.app.inject({method:'POST',url:'/api/auth/signout',headers:{cookie,origin:'http://127.0.0.1:3000'}})).statusCode,204);
 assert.equal((await s.app.inject({url:'/api/auth/session',headers:{cookie}})).statusCode,401);
 s.advance(3600001);assert.equal((await s.app.inject({url:'/api/auth/session',headers:s.headers})).statusCode,401);
 const prod=createApp({store:new MemoryStore(),mode:'production'});t.after(()=>prod.close());assert.equal((await prod.inject({method:'POST',url:'/api/demo/session'})).statusCode,404);
});
