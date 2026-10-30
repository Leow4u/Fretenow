import {createApp} from './app.ts';
import {PostgresStore} from './postgres.ts';

if(process.env.APP_MODE!=='demo'||process.env.NODE_ENV==='production')throw new Error('Only explicitly configured local demo execution is available. Set APP_MODE=demo with a non-production NODE_ENV.');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required; runtime does not fall back to memory');
const store=new PostgresStore(process.env.DATABASE_URL);
await store.migrate();
const app=createApp({store,mode:'demo',webOrigins:process.env.WEB_ORIGIN?[process.env.WEB_ORIGIN]:undefined});
app.addHook('onClose',async()=>store.close());
const port=Number(process.env.PORT??4100);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be an integer from 1024 to 65535');
await app.listen({host:'127.0.0.1',port});
console.log(`FreteNow demo API listening on http://127.0.0.1:${port} (PostgreSQL; no real freight or payments)`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void app.close();});
