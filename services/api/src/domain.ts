import {createHash,randomUUID} from 'node:crypto';
import type {Address,Draft,ShipmentEvent} from '../../../packages/contracts/src/index.ts';
export class ApiFailure extends Error {constructor(public status:number,public code:string,message:string,public fields?:Record<string,string>){super(message);}}
export function fail(status:number,code:string,message:string):never {throw new ApiFailure(status,code,message);}
export function object(value:unknown):Record<string,unknown> {if(!value||typeof value!=='object'||Array.isArray(value))return fail(400,'VALIDATION','Expected an object');return value as Record<string,unknown>;}
function text(value:unknown,path:string,max=160):string {if(typeof value!=='string'||!value.trim()||value.length>max)throw new ApiFailure(400,'VALIDATION','Invalid request',{[path]:`Required text, at most ${max} characters`});return value.trim();}
const states=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
function address(value:unknown,path:string):Address {const a=object(value);const result={name:text(a.name,`${path}.name`),address:text(a.address,`${path}.address`,240),city:text(a.city,`${path}.city`),state:text(a.state,`${path}.state`,2),postalCode:text(a.postalCode,`${path}.postalCode`,5),country:'US' as const};if(!states.has(result.state)||!/^\d{5}$/.test(result.postalCode)||a.country!=='US')throw new ApiFailure(400,'VALIDATION','Invalid US address',{[path]:'Use US, a valid state abbreviation and ZIP5'});return result;}
export function pickupDate(value:unknown,now:Date,requireCurrent=true):string {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return fail(400,'VALIDATION','pickupDate must be YYYY-MM-DD');const parsed=new Date(`${value}T00:00:00Z`);if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value||(requireCurrent&&(value<now.toISOString().slice(0,10)||parsed.getTime()>now.getTime()+366*86400000)))return fail(400,'VALIDATION','pickupDate must be a real date within the next 366 days');return value;}
export function parseDraft(input:unknown,now:Date,requireCurrentDate=true):Draft {
 const d=object(input);if(typeof d.mode!=='string'||!['LTL','FTL','Expedited'].includes(d.mode))return fail(400,'VALIDATION','Invalid freight mode');
 if(!Array.isArray(d.items)||d.items.length<1||d.items.length>50)return fail(400,'VALIDATION','Provide 1 to 50 cargo items');
 const items=d.items.map((value,i)=>{const item=object(value);const number=(key:string,max:number,integer=false)=>{const n=item[key];if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>max||(integer&&!Number.isInteger(n)))throw new ApiFailure(400,'VALIDATION','Invalid cargo',{[`items.${i}.${key}`]:`Must be positive ${integer?'integer':'number'} <= ${max}`});return n;};return {description:text(item.description,`items.${i}.description`,240),quantity:number('quantity',10000,true),weightLb:number('weightLb',100000),lengthIn:number('lengthIn',1000),widthIn:number('widthIn',1000),heightIn:number('heightIn',1000)};});
 if(items.reduce((sum,i)=>sum+i.quantity*i.weightLb,0)>1000000)return fail(400,'VALIDATION','Total cargo exceeds demo limit');
 if(!Array.isArray(d.accessorials)||d.accessorials.length>20)return fail(400,'VALIDATION','Provide at most 20 accessorials');
 return {mode:d.mode as Draft['mode'],origin:address(d.origin,'origin'),destination:address(d.destination,'destination'),pickupDate:pickupDate(d.pickupDate,now,requireCurrentDate),items,accessorials:d.accessorials.map((a,i)=>text(a,`accessorials.${i}`,80))};
}
export const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export const event=(type:string,now:Date,actor:string,date?:string):ShipmentEvent=>({id:randomUUID(),type,at:now.toISOString(),actor,source:'demo',...(date?{pickupDate:date}:{})});
