import type {Account} from '../../contracts/src/index.ts';
export const demoTenantId='demo-fretenow';
export const accountFor=(tenantId:string):Account=>({id:`member-${tenantId}`,organizationId:tenantId,name:'Alex Demo',organizationName:'FreteNow Demo Company',email:'alex@example.invalid',demo:true});
export const settingsFor=(tenantId:string)=>({organization:{id:tenantId,name:'FreteNow Demo Company'},preferences:{currency:'USD',weightUnit:'lb',dimensionUnit:'in',timezone:'America/Chicago'},members:[{id:`member-${tenantId}`,name:'Alex Demo',role:'owner'}],locations:[],capabilities:{invites:false,credit:false,payments:false,realBooking:false},demo:true});
