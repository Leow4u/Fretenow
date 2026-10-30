import Fastify from 'fastify';
import type {FastifyRequest} from 'fastify';
import {randomBytes,randomUUID} from 'node:crypto';
import type {Shipment,Snapshot} from '../../../packages/contracts/src/index.ts';
import {accountFor,demoTenantId,settingsFor} from '../../../packages/fixtures/src/index.ts';
import {ApiFailure,event,fail,hash,object,parseDraft,pickupDate} from './domain.ts';
import type {Session,Store,TenantState} from './store.ts';

export interface AppOptions {store:Store;mode:'demo'|'production';clock?:()=>Date;webOrigins?:string[]}
export function createApp({store,mode,clock=()=>new Date(),webOrigins=['http://127.0.0.1:3000','http://localhost:3000']}:AppOptions) {
 const app=Fastify({bodyLimit:65536,logger:false});
 const demo=mode==='demo'&&process.env.NODE_ENV!=='production';
 const sessions=new WeakMap<FastifyRequest,{session:Session;token:string}>();
 const allowedOrigins=new Set(webOrigins.map(origin=>{const url=new URL(origin);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.protocol!=='http:'||url.origin!==origin)throw new Error('WEB_ORIGIN must be an exact HTTP loopback origin');return origin;}));
 const sessionFor=(request:FastifyRequest)=>{const value=sessions.get(request);if(!value)return fail(401,'UNAUTHENTICATED','Sign in to continue');return value;};
 const tenant=(request:FastifyRequest)=>sessionFor(request).session.tenantId;
 const key=(request:FastifyRequest)=>{const k=request.headers['idempotency-key'];if(typeof k!=='string'||! /^[A-Za-z0-9_.:-]{1,128}$/.test(k))return fail(400,'IDEMPOTENCY_KEY_REQUIRED','Provide an Idempotency-Key (1–128 safe ASCII characters)');return k;};
 const shipmentFor=(state:TenantState,id:string)=>Object.hasOwn(state.shipments,id)?state.shipments[id]:fail(404,'NOT_FOUND','Shipment not found');
 app.setErrorHandler((error,_request,reply)=>{
  if(error instanceof ApiFailure)return reply.code(error.status).send({error:{code:error.code,message:error.message,...(error.fields?{fields:error.fields}:{})}});
  const candidate=error as {statusCode?:number};
  const status=typeof candidate?.statusCode==='number'&&candidate.statusCode>=400&&candidate.statusCode<500?candidate.statusCode:500;
  return reply.code(status).send({error:{code:status===500?'INTERNAL_ERROR':'INVALID_REQUEST',message:status===500?'The request could not be completed':'Invalid request body or headers'}});
 });
 app.setNotFoundHandler((_request,reply)=>reply.code(404).send({error:{code:'NOT_FOUND',message:'Route not found'}}));
 app.addHook('onRequest',async(request,reply)=>{
  const origin=request.headers.origin;
  reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff').header('Vary','Origin');
  if(origin&&allowedOrigins.has(origin))reply.header('Access-Control-Allow-Origin',origin).header('Access-Control-Allow-Credentials','true');
  if(request.method==='OPTIONS') {if(!origin||!allowedOrigins.has(origin))return reply.code(403).send({error:{code:'ORIGIN_DENIED',message:'Origin is not allowed'}});return reply.header('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS').header('Access-Control-Allow-Headers','Content-Type,Authorization,Idempotency-Key').code(204).send();}
  const path=request.url.split('?')[0];if(path==='/health')return;
  if(path==='/api/demo/session') {if(!demo)return fail(404,'NOT_FOUND','Route not found');if(origin&&!allowedOrigins.has(origin))return fail(403,'ORIGIN_DENIED','Origin is not allowed');return;}
  if(!path.startsWith('/api/'))return;
  const auth=request.headers.authorization;
  let token:string|undefined;let cookieAuth=false;
  if(auth!==undefined){if(!auth.startsWith('Bearer ')||auth.length>512)return fail(401,'UNAUTHENTICATED','Invalid bearer token');token=auth.slice(7);}else {token=request.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('fretenow_session='))?.slice('fretenow_session='.length);cookieAuth=true;}
  if(!token)return fail(401,'UNAUTHENTICATED','Sign in to continue');
  const session=await store.getSession(token);if(!session||Date.parse(session.expiresAt)<=clock().getTime())return fail(401,'SESSION_EXPIRED','Session expired; sign in again');
  if(cookieAuth&&!['GET','HEAD'].includes(request.method)&&(!origin||!allowedOrigins.has(origin)))return fail(403,'ORIGIN_DENIED','Cookie mutations require an allowed Origin');
  sessions.set(request,{session,token});
 });
 app.get('/health',async(_request,reply)=>{try{await store.ready();return {ready:true,mode:demo?'demo':'production',storage:store.kind};}catch{return reply.code(503).send({ready:false,mode:demo?'demo':'production',storage:store.kind});}});
 app.post('/api/demo/session',async(_request,reply)=>{const token=randomBytes(32).toString('base64url');await store.createSession(token,{tenantId:demoTenantId,expiresAt:new Date(clock().getTime()+3600000).toISOString()});return reply.header('Set-Cookie',`fretenow_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600`).code(201).send({token,account:accountFor(demoTenantId),demo:true});});
 app.get('/api/auth/session',async request=>({account:accountFor(tenant(request)),demo:true}));
 app.post('/api/auth/signout',async(request,reply)=>{await store.deleteSession(sessionFor(request).token);return reply.header('Set-Cookie','fretenow_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0').code(204).send();});
 app.addHook('preHandler',async request=>{if(!demo&&request.url.startsWith('/api/v1/'))return fail(501,'CAPABILITY_UNAVAILABLE','Production freight providers and identity are not configured');});
 const snapshot=(request:FastifyRequest)=>store.transaction(tenant(request),state=>({account:accountFor(tenant(request)),shipments:Object.values(state.shipments),claims:[],actions:Object.values(state.shipments).filter(s=>s.status==='booked').map(s=>({id:`pickup-${s.id}`,shipmentId:s.id,type:'upcoming_pickup',dueDate:s.pickupDate})),watchers:[],settings:settingsFor(tenant(request)),schedules:[],demo:true} satisfies Snapshot));
 app.get('/api/v1/snapshot',snapshot);
 app.get('/api/v1/shipments',async request=>store.transaction(tenant(request),state=>({shipments:Object.values(state.shipments),demo:true})));
 app.get<{Params:{id:string}}>('/api/v1/shipments/:id',async request=>store.transaction(tenant(request),state=>shipmentFor(state,request.params.id)));
 app.get<{Params:{id:string}}>('/api/v1/shipments/:id/events',async request=>store.transaction(tenant(request),state=>({events:shipmentFor(state,request.params.id).events,demo:true})));
 app.post('/api/v1/rates',async request=>{
  const now=clock();const draft=parseDraft(request.body,now);const draftHash=hash(draft);
  const weight=draft.items.reduce((total,item)=>total+item.quantity*item.weightLb,0);
  const base=15000+Math.round(weight*17)+draft.accessorials.length*2500+(draft.mode==='FTL'?80000:draft.mode==='Expedited'?45000:0);
  const rates=['Demo Road Freight','Demo Continental','Demo Priority'].map((carrier,index)=>({id:randomUUID(),carrier,amountMinor:base+index*6500,currency:'USD' as const,transitDays:[5,3,2][index],validUntilISO:new Date(now.getTime()+15*60000).toISOString(),draftHash,demo:true as const}));
  await store.transaction(tenant(request),state=>{for(const rate of rates)state.rates[rate.id]=rate;});return {rates};
 });
 app.post('/api/v1/shipments',async(request,reply)=>{
  const idempotencyKey=`booking:${key(request)}`;const body=object(request.body);if(typeof body.rateId!=='string'||body.rateId.length>100)return fail(400,'VALIDATION','rateId is required');
  const draft=parseDraft(body.draft,clock(),false);const payloadHash=hash({rateId:body.rateId,draft});
  const result=await store.transaction(tenant(request),state=>{
   const previous=state.idempotency[idempotencyKey];if(previous){if(previous.hash!==payloadHash)return fail(409,'IDEMPOTENCY_CONFLICT','This key was already used with another payload');return {shipment:previous.shipment,replayed:true};}
   pickupDate(draft.pickupDate,clock());
   const rate=Object.hasOwn(state.rates,body.rateId as string)?state.rates[body.rateId as string]:undefined;if(!rate)return fail(404,'NOT_FOUND','Rate not found');
   if(rate.draftHash!==hash(draft))return fail(409,'DRAFT_CHANGED','Cargo or route changed; request new rates');
   if(Date.parse(rate.validUntilISO)<=clock().getTime())return fail(409,'RATE_EXPIRED','Rate expired; request new rates');
   const now=clock();const shipment:Shipment={...draft,id:randomUUID(),status:'booked',carrier:rate.carrier,amountMinor:rate.amountMinor,currency:'USD',createdAt:now.toISOString(),demo:true,events:[event('booked',now,accountFor(tenant(request)).id)]};
   state.shipments[shipment.id]=shipment;state.idempotency[idempotencyKey]={hash:payloadHash,shipment:structuredClone(shipment)};return {shipment,replayed:false};
  });return reply.code(result.replayed?200:201).send(result.shipment);
 });
 app.post<{Params:{id:string}}>('/api/v1/shipments/:id/actions',async request=>{
  const body=object(request.body);const action=body.type;if(action!=='cancel'&&action!=='reschedule')return fail(400,'VALIDATION','Action must be cancel or reschedule');
  const date=action==='reschedule'?pickupDate(body.pickupDate,clock(),false):undefined;const payloadHash=hash({id:request.params.id,type:action,pickupDate:date});const idempotencyKey=`action:${key(request)}`;
  return store.transaction(tenant(request),state=>{const shipment=shipmentFor(state,request.params.id);const previous=state.idempotency[idempotencyKey];if(previous){if(previous.hash!==payloadHash)return fail(409,'IDEMPOTENCY_CONFLICT','This key was already used with another payload');return previous.shipment;}
   if(shipment.status!=='booked')return fail(409,'INVALID_TRANSITION','Only booked demo shipments can be cancelled or rescheduled');
   if(date)pickupDate(date,clock());
   if(action==='cancel')shipment.status='cancelled';else shipment.pickupDate=date!;
   shipment.events.push(event(action==='cancel'?'cancelled':'rescheduled',clock(),accountFor(tenant(request)).id,date));state.idempotency[idempotencyKey]={hash:payloadHash,shipment:structuredClone(shipment)};return shipment;
  });
 });
 app.get('/api/v1/settings',async request=>settingsFor(tenant(request)));
 for(const route of ['claims','schedules','price-matches','documents','payments'])app.get(`/api/v1/${route}`,async()=>({[route==='price-matches'?'priceMatches':route]:[],capabilities:{write:false,provider:false},demo:true}));
 app.get('/api/v1/home/needs',async request=>({actions:(await snapshot(request)).actions,demo:true}));
 app.get('/api/v1/analytics',async request=>store.transaction(tenant(request),state=>{const shipments=Object.values(state.shipments);return {totalShipments:shipments.length,bookedAmountMinor:shipments.filter(s=>s.status!=='cancelled').reduce((n,s)=>n+s.amountMinor,0),currency:'USD',byStatus:Object.fromEntries(['booked','in_transit','delivered','cancelled'].map(status=>[status,shipments.filter(s=>s.status===status).length])),demo:true};}));
 for(const route of ['payments','payments/credit','credit','documents','claims','schedules','price-matches','settings/invites','shipments/:id/send'])app.post(`/api/v1/${route}`,async()=>fail(501,'CAPABILITY_UNAVAILABLE','This integration is unavailable in the local demo'));
 return app;
}
