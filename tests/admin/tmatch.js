
process.env.SUPABASE_SERVICE_ROLE_KEY='svc';process.env.RESEND_API_KEY='rk';
const T={id:'11111111-1111-1111-1111-111111111111',owner_id:'22222222-2222-2222-2222-222222222222',guest_token:'33333333-3333-3333-3333-333333333333',other_name:'Test Person',other_email:'guest@example.com',where_met:'In person',confirmed:true,mine:'meet',theirs:'meet'};
let ev=[],sent=[],nid=1,prefs={};
global.fetch=async(u,o={})=>{const m=o.method||'GET';const J=b=>({ok:true,status:200,json:async()=>b});
 if(u.includes('api.resend.com')){sent.push(JSON.parse(o.body));return J({id:'x'});}
 if(u.includes('/auth/v1/admin/users/'))return J({email:'owner@example.com'});
 if(u.includes('/auth/v1/user'))return J({id:T.owner_id});
 if(u.includes('/rest/v1/threads'))return J([T]);
 if(u.includes('/rest/v1/profiles'))return J([{name:'Owner One',prefs}]);
 if(u.includes('/rest/v1/thread_events')){
   if(m==='POST'){const r={id:nid++};ev.push(r);return J([r]);}
   if(m==='DELETE'){const id=+u.split('id=eq.')[1];ev=ev.filter(e=>e.id!==id);return J([]);}
   return J(ev.slice().sort((a,b)=>a.id-b.id).slice(0,1));}
 return {ok:false,status:404,json:async()=>({})};};
const h=require('/home/user/introthread/api/match-notify.js');
const call=(body,hd={})=>new Promise(res=>{const r={statusCode:0,setHeader(){},end(s){res([this.statusCode,JSON.parse(s)]);}};h({method:'POST',url:'/api/match-notify',headers:Object.assign({},hd),body,socket:{}},r);});
(async()=>{const errs=[];const ck=(c,m)=>{if(!c)errs.push(m)};
 let r=await call({token:T.guest_token});ck(r[1].sent===2,'first send '+JSON.stringify(r));ck(sent.length===2&&sent.every(s=>/matched: Meet again/.test(s.subject)),'subjects');
 ck(sent.map(s=>s.to[0]).sort().join()==='guest@example.com,owner@example.com','recipients');
 r=await call({thread_id:T.id},{authorization:'Bearer a.b.c',apikey:'a.b.c'});ck(r[1].reason==='already_sent','once '+JSON.stringify(r));ck(sent.length===2,'no resend');
 ev=[];sent=[];const rs=await Promise.all([call({token:T.guest_token}),call({token:T.guest_token})]);ck(sent.length===2,'race sent '+sent.length);ck(ev.length===1,'race marks '+ev.length);
 ev=[];sent=[];T.theirs='intro';r=await call({token:T.guest_token});ck(r[1].reason==='no_match'&&!sent.length,'no match');
 T.theirs='notnow';T.mine='notnow';r=await call({token:T.guest_token});ck(r[1].reason==='no_match','notnow');
 T.mine=T.theirs='keep';prefs={emailMatch:false};r=await call({token:T.guest_token});ck(r[1].sent===1&&sent[0].to[0]==='guest@example.com','owner opted out');
 ev=[];sent=[];r=await call({thread_id:T.id});ck(r[0]===401,'needs auth');
 r=await call({});ck(r[0]===400,'bad input');
 console.log('errs',JSON.stringify(errs));})();
