
process.env.PAYSTACK_SECRET_KEY='sk';process.env.SUPABASE_SERVICE_ROLE_KEY='svc';process.env.RESEND_API_KEY='rk';
let orders=[],mails=[],taps=[],init=null,payments=[];
global.fetch=async(u,o={})=>{const m=o.method||'GET';const J=b=>({ok:true,status:200,json:async()=>b,text:async()=>JSON.stringify(b)});
 if(u.includes('api.resend.com')){mails.push(JSON.parse(o.body));return J({id:1});}
 if(u.includes('/transaction/initialize')){init=JSON.parse(o.body);return J({status:true,data:{authorization_url:'https://pay/x'}});}
 if(u.includes('/auth/v1/user'))return J({id:'u1',email:'buyer@example.com'});
 if(u.includes('/rest/v1/profiles?handle=eq.agnes'))return J([{id:'p1'}]);
 if(u.includes('/rest/v1/profiles?handle='))return J([]);
 if(u.includes('/rest/v1/profiles?id=eq'))return m==='PATCH'?J([]):J([{prefs:{}}]);
 if(u.includes('/rest/v1/card_taps')){taps.push(JSON.parse(o.body));return J([]);}
 if(u.includes('/rest/v1/card_orders')){const r=JSON.parse(o.body);if(orders.some(x=>x.reference===r.reference))return J([]);orders.push(r);return J([r]);}
 if(u.includes('/rest/v1/payments')){payments.push(1);return J([]);}
 return{ok:false,status:404,json:async()=>({}),text:async()=>''};};
const call=(h,body,hd={})=>new Promise(res=>{const r={statusCode:0,setHeader(){},end(s){res([this.statusCode,JSON.parse(s)]);}};h({method:'POST',url:'/x',headers:Object.assign({authorization:'Bearer a.b.c',apikey:'a.b.c'},hd),body,socket:{}},r);});
(async()=>{const errs=[];const ck=(c,m)=>{if(!c)errs.push(m)};
 const init_=require('/home/user/introthread/api/pay-init.js');
 let r=await call(init_,{kind:'nfc_card',name:'Agnes W',title:'CEO',phone:'+254 700 000 000',delivery:'Westlands, Nairobi',handle:'agnes'});
 ck(r[0]===200&&r[1].amount===199&&init&&init.amount===19900&&init.currency==='KES'&&init.metadata.kind==='nfc_card'&&init.metadata.phone==='+254 700 000 000','init '+JSON.stringify(r));
 r=await call(init_,{kind:'nfc_card',name:'A',phone:'x',delivery:'',handle:'agnes'});ck(r[0]===400,'bad details');
 const {applyCardOrder,svc}=require('/home/user/introthread/api/_lib/pay.js');
 const tx={reference:'ref1',amount:19900,currency:'KES',customer:{email:'buyer@example.com'},metadata:{kind:'nfc_card',name:'Agnes W',title:'CEO',phone:'+254700000000',delivery:'Westlands',handle:'agnes'}};
 let o=await applyCardOrder(svc(),'u1',tx);ck(o.created&&orders.length===1&&orders[0].status==='paid'&&mails.length===2,'order '+JSON.stringify(o)+mails.length);
 ck(mails.some(x=>x.to[0]==='hello@introthread.com'&&/agnes\?src=nfc/.test(x.text))&&mails.some(x=>x.to[0]==='buyer@example.com'),'emails');
 o=await applyCardOrder(svc(),'u1',tx);ck(!o.created&&orders.length===1&&mails.length===2,'once per reference');
 const tap=require('/home/user/introthread/api/status.js');
 r=await call(tap,{handle:'agnes'},{authorization:''});ck(r[0]===200&&taps.length===1&&taps[0].profile_id==='p1'&&taps[0].src==='nfc','tap '+JSON.stringify(r));
 r=await call(tap,{handle:'nobody'});ck(r[0]===404,'unknown card');
 r=await call(tap,{handle:'../x'});ck(r[0]===400,'bad handle');
 console.log('errs',JSON.stringify(errs));})();
