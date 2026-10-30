import pg from 'pg';
import {readFile} from 'node:fs/promises';
import type {Store,Session,TenantState} from './store.ts';
import {tokenHash} from './domain.ts';
export class PostgresStore implements Store {
 kind='postgres';readonly pool:pg.Pool;
 constructor(connectionString:string) {this.pool=new pg.Pool({connectionString,max:10,connectionTimeoutMillis:5000});}
 async migrate() {await this.pool.query(await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8'));}
 async ready() {await this.pool.query('SELECT 1');}
 async createSession(token:string,session:Session) {await this.pool.query('INSERT INTO fretenow_sessions(token_hash,tenant_id,expires_at) VALUES($1,$2,$3)',[tokenHash(token),session.tenantId,session.expiresAt]);}
 async getSession(token:string):Promise<Session|undefined> {const r=await this.pool.query('SELECT tenant_id,expires_at FROM fretenow_sessions WHERE token_hash=$1',[tokenHash(token)]);return r.rows[0]?{tenantId:r.rows[0].tenant_id,expiresAt:new Date(r.rows[0].expires_at).toISOString()}:undefined;}
 async deleteSession(token:string) {await this.pool.query('DELETE FROM fretenow_sessions WHERE token_hash=$1',[tokenHash(token)]);}
 async transaction<T>(tenantId:string,operation:(state:TenantState)=>T|Promise<T>):Promise<T> {
  const client=await this.pool.connect();try{await client.query('BEGIN');await client.query('INSERT INTO fretenow_tenants(id) VALUES($1) ON CONFLICT DO NOTHING',[tenantId]);const r=await client.query('SELECT state FROM fretenow_tenants WHERE id=$1 FOR UPDATE',[tenantId]);const state=r.rows[0].state as TenantState;const result=await operation(state);await client.query('UPDATE fretenow_tenants SET state=$2::jsonb WHERE id=$1',[tenantId,JSON.stringify(state)]);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async close() {await this.pool.end();}
}
