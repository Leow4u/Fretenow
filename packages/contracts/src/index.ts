export type Mode = 'LTL' | 'FTL' | 'Expedited';
export interface Address {name:string;address:string;city:string;state:string;postalCode:string;country:'US'}
export interface CargoItem {description:string;quantity:number;weightLb:number;lengthIn:number;widthIn:number;heightIn:number}
export interface Draft {mode:Mode;origin:Address;destination:Address;pickupDate:string;items:CargoItem[];accessorials:string[]}
export interface Rate {id:string;carrier:string;amountMinor:number;currency:'USD';transitDays:number;validUntilISO:string;draftHash:string;demo:true}
export interface ShipmentEvent {id:string;type:string;at:string;actor:string;source:'demo';pickupDate?:string}
export interface Shipment extends Draft {id:string;status:'booked'|'in_transit'|'delivered'|'cancelled';carrier:string;amountMinor:number;currency:'USD';createdAt:string;demo:true;events:ShipmentEvent[]}
export interface Account {id:string;organizationId:string;name:string;organizationName:string;email:string;demo:true}
export interface SessionResponse {account:Account;demo:true}
export interface DemoSessionResponse extends SessionResponse {token:string}
export interface ApiError {error:{code:string;message:string;fields?:Record<string,string>}}
export interface Snapshot extends SessionResponse {shipments:Shipment[];claims:unknown[];actions:unknown[];watchers:unknown[];settings:Record<string,unknown>;schedules:unknown[]}
