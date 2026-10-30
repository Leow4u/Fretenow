import type {Rate,Shipment} from '../../../packages/contracts/src/index.ts';
import {tokenHash} from './domain.ts';
export interface Session {tenantId:string;expiresAt:string}
export interface TenantState {rates:Record<string,Rate>;shipments:Record<string,Shipment>;idempotency:Record<string,{hash:string;shipment:Shipment}>}
export const emptyState=():TenantState=>({rates:{},shipments:{},idempotency:{}});
export interface Store {kind:string;ready():Promise<void>;createSession(token:string,session:Session):Promise<void>;getSession(token:string):Promise<Session|undefined>;deleteSession(token:string):Promise<void>;transaction<T>(tenantId:string,operation:(state:TenantState)=>T|Promise<T>):Promise<T>;close():Promise<void>}
export class MemoryStore implements Store {
 kind='memory';private sessions=new Map<string,Session>();private tenants=new Map<string,TenantState>();private tails=new Map<string,Promise<void>>();
 async ready() {} async close() {}
 async createSession(token:string,session:Session) {this.sessions.set(tokenHash(token),structuredClone(session));}
 async getSession(token:string) {const s=this.sessions.get(tokenHash(token));return s?structuredClone(s):undefined;}
 async deleteSession(token:string) {this.sessions.delete(tokenHash(token));}
 async transaction<T>(tenantId:string,operation:(state:TenantState)=>T|Promise<T>):Promise<T> {
  const previous=this.tails.get(tenantId)??Promise.resolve();let unlock!:()=>void;const current=new Promise<void>(resolve=>{unlock=resolve;});this.tails.set(tenantId,current);await previous;
  try {const state=structuredClone(this.tenants.get(tenantId)??emptyState());const result=await operation(state);this.tenants.set(tenantId,state);return structuredClone(result);}finally{unlock();if(this.tails.get(tenantId)===current)this.tails.delete(tenantId);}
 }
}
