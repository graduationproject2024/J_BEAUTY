import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
const app=createApp({dbPath:':memory:'});
app.ownerBootstrap({name:'Security test owner',phone:'0509000001',password:'Owner-security-test-2026'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${app.server.address().port}`,passed=[];
class Client {
 cookie='';csrf='';
 async call(path,body,expected=200,headers={}) {
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Cookie:this.cookie,...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':this.csrf,Origin:base}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.headers.getSetCookie().length)this.cookie=response.headers.getSetCookie()[0].split(';')[0];
  const data=await response.json();if(data.csrfToken)this.csrf=data.csrfToken;
  if(expected!==null)assert.equal(response.status,expected,`${path}: ${JSON.stringify(data)}`);
  return {code:response.status,...data};
 }
 async init(){await this.call('/api/session');return this;}
}
async function test(name,fn){await fn();passed.push(name);console.log('PASS '+name);}
const owner=await new Client().init(),customer=await new Client().init(),other=await new Client().init(),employee=await new Client().init();
const future=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
try {
 await owner.call('/api/login',{phone:'0509000001',password:'Owner-security-test-2026'});
 const before=customer.cookie;
 await customer.call('/api/register',{name:'Security customer',phone:'0509000002',password:'Customer-security-test-2026',passwordConfirmation:'Customer-security-test-2026',terms:true},201);
 const user=(await customer.call('/api/session')).user;
 await other.call('/api/register',{name:'Other customer',phone:'0509000003',password:'Other-security-test-2026',passwordConfirmation:'Other-security-test-2026',terms:true},201);
 await owner.call('/api/admin/staff',{name:'Security employee',phone:'0509000004',password:'Employee-security-test-2026',role:'employee'},201);
 await employee.call('/api/login',{phone:'0509000004',password:'Employee-security-test-2026'});
 await test('Authentication rotates anonymous session cookie',async()=>assert.notEqual(before,customer.cookie));
 await test('A valid session cannot mutate without its CSRF token',async()=>{await owner.call('/api/admin/settings',{settings:{capacity:9}},403,{'X-CSRF-Token':'invalid'});});
 await test('Valid CSRF token cannot bypass foreign Origin rejection',async()=>{await owner.call('/api/admin/settings',{settings:{capacity:9}},403,{Origin:'https://attacker.invalid'});});
 await test('Employees cannot change owner settings, catalog, staff or ledger',async()=>{
  for(const [path,data]of [['settings',{settings:{capacity:9}}],['services',{}],['packages',{}],['staff',{}],['adjustment',{user_id:user.id,points:999,reason:'Forbidden'}]])await employee.call('/api/admin/'+path,data,403);
  const view=await employee.call('/api/admin');assert.deepEqual(view.settings,{});assert.deepEqual(view.staff,[]);assert.deepEqual(view.audit,[]);assert.deepEqual(view.analytics,{});assert.deepEqual(view.payments,[]);assert.deepEqual(view.ledger,[]);
  assert.ok(view.customers.length>=1);
  assert.equal(view.customers[0].phone,undefined);
  assert.ok(view.customers[0].phone_masked.includes('****'));
 });
 await test('Newly registered users use Argon2id password hashing',async()=>{
  const row=app.db.prepare('SELECT password FROM users WHERE id=?').get(user.id);
  assert.ok(row.password.startsWith('argon2id:'));
 });
 await test('Hidden paths and missing assets never leak index.html',async()=>{
  for(const bad of ['/.git/HEAD','/../server.mjs','/assets/images/does-not-exist.webp']){
   const r=await fetch(base+bad);
   assert.ok(r.status===403||r.status===404,`${bad} returned ${r.status}`);
  }
 });
 await test('Unverified account cannot request rewards',async()=>{await customer.call('/api/rewards/request',{reward_id:'petal-200'},403);});
 await test('Expired verification reference cannot establish ownership',async()=>{
  const v=await customer.call('/api/verification/request',{});app.db.prepare('UPDATE verification SET expires=0 WHERE user_id=?').run(user.id);
  await owner.call('/api/admin/verify',{user_id:user.id,reference:v.reference,observed_phone:user.phone,checked:true},400);
  assert.equal((await customer.call('/api/session')).user.verified,false);
 });
 const verification=await customer.call('/api/verification/request',{});
 await owner.call('/api/admin/verify',{user_id:user.id,reference:verification.reference,observed_phone:user.phone,checked:true});
 await owner.call('/api/admin/settings',{settings:{capacity:1,areas:['Security district'],working_days:[0,1,2,3,4,5,6],opening_time:'08:00',closing_time:'22:00',lead_hours:1,travel_buffer:30,business_approved:true}});
 const request={service_ids:['relaxation'],name:'Security customer',phone:'0509000002',date:future,time:'12:00',neighborhood:'Security district',terms:true,idempotency_key:'security-booking-1'};
 const booked=(await customer.call('/api/bookings',request,201)).booking;
 await test('One customer cannot obtain another customer’s account bookings',async()=>{assert.equal((await other.call('/api/account')).bookings.some(b=>b.id===booked.id),false);await other.call('/api/admin',undefined,403);});
 await owner.call('/api/admin/bookings/'+booked.id,{status:'confirmed'});
 await test('Travel buffer prevents adjacent service confirmation',async()=>{
  const adjacent=(await customer.call('/api/bookings',{...request,time:'13:00',idempotency_key:'security-adjacent'},201)).booking;
  await owner.call('/api/admin/bookings/'+adjacent.id,{status:'confirmed'},409);
 });
 await test('A verified payment before completion awards zero points',async()=>{
  await owner.call('/api/admin/bookings/'+booked.id,{paid_amount:199.99,payment_method:'cash',payment_verified:true});
  assert.equal((await customer.call('/api/account')).balance,0);
 });
 await test('Completed verified payment floors fractional eligible spend',async()=>{
  await owner.call('/api/admin/bookings/'+booked.id,{status:'completed'});
  assert.equal((await customer.call('/api/account')).balance,199);
 });
 await test('Partial refund reverses points once and cannot be reduced',async()=>{
  await owner.call('/api/admin/bookings/'+booked.id,{refund_amount:20,reason:'Security test partial refund'});
  assert.equal((await customer.call('/api/account')).balance,179);
  await owner.call('/api/admin/bookings/'+booked.id,{refund_amount:20,reason:'Idempotent retry'});
  assert.equal((await customer.call('/api/account')).balance,179);
  await owner.call('/api/admin/bookings/'+booked.id,{refund_amount:10,reason:'Forbidden decrease'},400);
 });
 await test('Employee cannot refund or alter a verified amount',async()=>{
  await employee.call('/api/admin/bookings/'+booked.id,{refund_amount:30,reason:'Forbidden refund'},403);
  await employee.call('/api/admin/bookings/'+booked.id,{paid_amount:999},400);
 });
 await test('Unsafe schedule and reward settings are rejected',async()=>{
  for(const setting of [{capacity:-1},{working_days:[7]},{opening_time:'22:00',closing_time:'08:00'},{rewards:[{id:'bad',points:-1,value:10}]},{points_per_sar:-1}])await owner.call('/api/admin/settings',{settings:setting},400);
 });
 await test('Expired password reset token is rejected',async()=>{
  const recovery=await employee.call('/api/admin/recovery',{user_id:user.id,observed_phone:user.phone,checked:true});
  app.db.prepare('UPDATE recovery SET expires=0 WHERE user_id=?').run(user.id);
  await other.call('/api/reset',{token:recovery.token,password:'New-customer-password-2026'},400);
 });
 await test('Password reset is single use and invalidates previous sessions',async()=>{
  const recovery=await employee.call('/api/admin/recovery',{user_id:user.id,observed_phone:user.phone,checked:true});
  await other.call('/api/reset',{token:recovery.token,password:'New-customer-password-2026'});
  await other.call('/api/reset',{token:recovery.token,password:'Another-customer-password-2026'},400);
  assert.equal((await customer.call('/api/session')).user,null);
  await customer.call('/api/login',{phone:user.phone,password:'New-customer-password-2026'});
 });
 await test('Owner can revoke employee access and invalidate the session',async()=>{
  const identity=(await employee.call('/api/session')).user;
  await employee.call('/api/admin/staff/'+identity.id,{action:'disable'},403);
  await owner.call('/api/admin/staff/'+identity.id,{action:'disable'});
  assert.equal((await employee.call('/api/session')).user,null);
  await employee.call('/api/admin',undefined,401);
  await owner.call('/api/admin/staff/'+identity.id,{action:'enable'});
  assert.equal((await owner.call('/api/admin')).staff.find(item=>item.id===identity.id).role,'employee');
 });
 await test('Atelier styles and Passport preferences enforce customer isolation',async()=>{
  const style=(await customer.call('/api/atelier/styles',{name:'Private Look',shape:'squoval',length:'short',polish_color:'#D9B7C0',french_style:'none',finish:'matte',accent:'none',share:false},201)).style;
  await other.call(`/api/atelier/styles/${style.id}/delete`,{},403);
 });
 await test('Gift redemption requires verified payment and employee sees masked sender phone',async()=>{
  const gf=(await customer.call('/api/gift-requests',{sender_name:'Gift Sender',sender_phone:'0509000002',recipient_name:'Friend',service_id:'relaxation',terms:true},201)).gift_request;
  await owner.call(`/api/admin/gift-requests/${gf.id}`,{status:'redeemed'},400);
  await employee.call('/api/login',{phone:'0509000004',password:'Employee-security-test-2026'});
  const empView=await employee.call('/api/admin');
  const seenGift=empView.gift_requests.find(x=>x.id===gf.id);
  assert.ok(seenGift&&seenGift.sender_phone.includes('****'));
 });
 console.log(`\n${passed.length} security checks passed.`);
} finally {await app.close();}
