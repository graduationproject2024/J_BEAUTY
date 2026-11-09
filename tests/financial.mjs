import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
const app=createApp({dbPath:':memory:'});
app.ownerBootstrap({name:'Test Owner',phone:'0500000001',password:'TestOwner!Pass2026'});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.server.address().port}`;
class Client{cookie='';csrf='';async call(path,data,ok=true){const r=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{Cookie:this.cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':this.csrf},body:data===undefined?undefined:JSON.stringify(data)});if(r.headers.getSetCookie().length)this.cookie=r.headers.getSetCookie()[0].split(';')[0];const v=await r.json();if(v.csrfToken)this.csrf=v.csrfToken;if(ok)assert.ok(r.ok,`${path} ${r.status} ${JSON.stringify(v)}`);return {...v,httpStatus:r.status};}async init(){await this.call('/api/session');return this;}}
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name)}
try{
 const owner=await new Client().init(),c=await new Client().init();await owner.call('/api/login',{phone:'0500000001',password:'TestOwner!Pass2026'});
 await owner.call('/api/admin/settings',{settings:{areas:['Test'],capacity:2,lead_hours:0,business_approved:true}});
 await c.call('/api/register',{name:'Customer',phone:'0500000002',password:'TestCustomer!2026',passwordConfirmation:'TestCustomer!2026',terms:true});
 const user=(await c.call('/api/session')).user;
 await test('Expired verification references fail',async()=>{const v=await c.call('/api/verification/request',{});app.db.prepare('UPDATE verification SET expires=0').run();const r=await owner.call('/api/admin/verify',{user_id:user.id,reference:v.reference,observed_phone:user.phone,checked:true},false);assert.equal(r.httpStatus,400);});
 const v=await c.call('/api/verification/request',{});await owner.call('/api/admin/verify',{user_id:user.id,reference:v.reference,observed_phone:user.phone,checked:true});
 const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 const book=async(time)=> (await c.call('/api/bookings',{service_ids:['relaxation'],date,time,name:'Customer',phone:'0500000002',neighborhood:'Test',notes:'',terms:true,idempotency_key:crypto.randomUUID()})).booking;
 const update=(b,data,ok=true)=>owner.call('/api/admin/bookings/'+b.id,data,ok),bal=async()=> (await c.call('/api/account')).balance;
 const b=await book('10:00');
 await test('Paid before completion earns zero; completion awards once',async()=>{await update(b,{status:'confirmed',paid_amount:250,payment_method:'cash',payment_verified:true});assert.equal(await bal(),0);await update(b,{status:'completed'});assert.equal(await bal(),250);await update(b,{status:'completed'});assert.equal(await bal(),250);});
 await test('Partial refund reverses exactly the eligible points',async()=>{await update(b,{refund_amount:25.5,reason:'Test partial refund'});assert.equal(await bal(),224);await update(b,{refund_amount:25.5,reason:'Repeated request'});assert.equal(await bal(),224);});
 await test('Immutable verified payment rejects amount overwrite',async()=>{assert.equal((await update(b,{paid_amount:999},false)).httpStatus,400);assert.equal(await bal(),224);});
 const target=await book('13:00'),r=(await c.call('/api/rewards/request',{reward_id:'petal-200'})).reward_request;
 await owner.call('/api/admin/rewards/'+r.id,{action:'commit',booking_id:target.id});
 await test('Refund cannot drive balance below zero and transaction rolls back',async()=>{const out=await update(b,{refund_amount:250,reason:'Full refund'},false);assert.equal(out.httpStatus,409);assert.equal(await bal(),24);const stored=(await c.call('/api/account')).bookings.find(x=>x.id===b.id);assert.equal(stored.refund_cents,2550);});
 await test('Reward reversal restores points once; then full refund succeeds',async()=>{await owner.call('/api/admin/rewards/'+r.id,{action:'cancel'});assert.equal(await bal(),224);assert.equal((await owner.call('/api/admin/rewards/'+r.id,{action:'cancel'},false)).httpStatus,409);await update(b,{refund_amount:250,reason:'Full refund'});assert.equal(await bal(),0);});
 await test('Recovery expires and single-use reset invalidates all sessions',async()=>{let r=await owner.call('/api/admin/recovery',{user_id:user.id,observed_phone:user.phone,checked:true});app.db.prepare('UPDATE recovery SET expires=0').run();assert.equal((await c.call('/api/reset',{token:r.token,password:'ResetPassword!2026'},false)).httpStatus,400);r=await owner.call('/api/admin/recovery',{user_id:user.id,observed_phone:user.phone,checked:true});await c.call('/api/reset',{token:r.token,password:'ResetPassword!2026'});assert.equal((await c.call('/api/session')).user,null);assert.equal((await c.call('/api/reset',{token:r.token,password:'ResetPassword!2026'},false)).httpStatus,400);await c.call('/api/login',{phone:user.phone,password:'ResetPassword!2026'});});
 await test('Malformed schedule settings rejected without saving',async()=>{for(const settings of [{capacity:-1},{areas:'all'},{points_per_sar:-1},{working_days:[9]},{opening_time:'25:00'},{rewards:[{id:'bad',points:-2,value:10}]}])assert.ok((await owner.call('/api/admin/settings',{settings},false)).httpStatus>=400);assert.equal((await owner.call('/api/admin')).settings.capacity,2);});
 console.log(`${checks} financial and security checks passed.`);
}finally{await app.close();}
