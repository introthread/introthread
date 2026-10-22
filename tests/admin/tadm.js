const fs=require('fs');const {JSDOM}=require('jsdom');const errs=[];const calls=[];
const sl=ms=>new Promise(r=>setTimeout(r,ms));
const days=[...Array(30)].map((_,i)=>({d:new Date(Date.now()-(29-i)*864e5).toISOString().slice(0,10),n:i%4}));
let aal='aal1';
let RANGEOK=true,ZERO=false;
const mkR=days=>{const S=[...Array(days)].map((_,i)=>({d:new Date(Date.now()-(days-1-i)*864e5).toISOString().slice(0,10),n:ZERO?0:(i===days-1?3:i===days-2?1:0)}));return{days,users:3,users_period:ZERO?0:3,users_prev:0,active_period:0,active_prev:0,threads:0,threads_period:0,threads_prev:0,confirmed_period:0,confirmed_prev:0,answered_period:0,both_period:0,both_prev:0,contacts:0,contacts_period:0,contacts_prev:0,rooms:0,paying:0,mrr_usd:0,plans:{},billing_configured:false,reports_open:ZERO?0:2,reports_oldest:new Date(Date.now()-50*36e5).toISOString(),privacy_open:0,privacy_overdue:0,suspended:0,mfa_required:true,maintenance:false,staff_without_mfa:0,signups_by_day:S,threads_by_day:S.map(x=>({d:x.d,n:0})),cities:[{c:'Nairobi',n:2},{c:'Test City',n:1}]}};
const R={admin_stats_range:a=>{if(!RANGEOK)throw new Error('Could not find the function public.admin_stats_range(days) in the schema cache');return mkR(a.days)},admin_me:()=>({staff:true,role:'owner',aal,mfa_required:true}),admin_stats:()=>({users:3,users_7d:2,users_30d:3,active_7d:1,active_30d:2,threads:5,threads_30d:5,confirmed:2,answered:3,both_answered:1,contacts:12,rooms:1,reports_open:1,privacy_open:1,privacy_overdue:0,suspended:0,paying:1,mrr_usd:12,plans:{pro:1},signups_by_day:days,threads_by_day:days,cities:[{c:'Nairobi',n:2},{c:'London',n:1}]}),
admin_users:()=>({total:2,rows:[{id:'u1',name:'Moses Njeru',handle:'moses',email:'mosemqute@gmail.com',plan:'free',status:'active',threads:3,reports:0,staff:'owner',created_at:'2026-10-20'},{id:'u2',name:'Spam Bot',handle:'spam',email:'s@x.com',plan:'free',status:'active',threads:0,reports:1,created_at:'2026-10-21'}]}),
admin_user:()=>({profile:{name:'Spam Bot',handle:'spam',city:'',role:'',company:''},email:'s@x.com',plan:'free',status:'active',confirmed_email:true,providers:['email'],counts:{threads:0,confirmed:0,contacts:0,rooms:0},reports:[{reason:'Spam or scam',status:'open',created_at:'2026-10-21'}],audit:[]}),
admin_reports:()=>[{id:'r1',status:'open',reason:'Spam or scam',details:'Sends links',target_type:'profile',target_id:'u2',target:{name:'Spam Bot',handle:'spam'},reporter:{name:'Moses'},created_at:'2026-10-21'}],
admin_rooms:()=>[{id:'m1',name:'Kenya Investment Networking Meetup',event_date:'2026-10-25',location:'Nairobi',code:'KIN',owner:{name:'Moses'},threads:4,people:2}],
admin_subscriptions:()=>[{user_id:'u1',plan_id:'pro',status:'active',name:'Moses',handle:'moses'}],
admin_privacy:()=>[{id:'p1',kind:'export',status:'open',user_id:'u2',name:'Spam Bot',account_email:'s@x.com',created_at:'2026-10-21',due_at:new Date(Date.now()+29*864e5).toISOString()}],
admin_staff:()=>[{email:'mosemqute@gmail.com',role:'owner',name:'Moses'}],
admin_audit:()=>[{action:'user.status.suspended',actor:'Moses',reason:'spam',target_type:'user',target_id:'u2',created_at:'2026-10-21'}]};
const tbl={plans:[{id:'free',name:'Free',price_usd_month:0,price_usd_year:0,price_gbp_month:0,price_gbp_year:0,threads_per_month:5,active:true},{id:'pro',name:'Pro',price_usd_month:12,price_usd_year:120,price_gbp_month:10,price_gbp_year:96,threads_per_month:null,active:true}],
app_settings:[{key:'free_threads_per_month',value:5},{key:'maintenance',value:false},{key:'features',value:{rooms:true}},{key:'admin_require_mfa',value:true},{key:'announcement',value:{on:true,text:'New: import contacts',tone:'info'}}]};
const chain=t=>{const p=Promise.resolve({data:tbl[t]||[],error:null});p.select=()=>chain(t);p.order=()=>chain(t);p.eq=()=>chain(t);p.maybeSingle=()=>Promise.resolve({data:null,error:null});p.insert=x=>{calls.push(['insert',t,x]);return Promise.resolve({error:null})};return p};
const MOCK={rpc:async(fn,a)=>{calls.push(['rpc',fn,a]);try{return{data:R[fn]?R[fn](a):null,error:null}}catch(e){return{data:null,error:{message:e.message}}}},from:t=>chain(t),
 auth:{getSession:async()=>({data:{session:{user:{id:'u1'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  mfa:{listFactors:async()=>({data:{totp:[],all:[]},error:null}),enroll:async()=>({data:{id:'f1',totp:{qr_code:'data:image/svg+xml;utf8,<svg/>',secret:'ABC'}},error:null}),challengeAndVerify:async()=>{aal='aal2';return{error:null}},unenroll:async()=>({})}}};
const html=fs.readFileSync('index.html','utf8').replace(/<script src="\/js\/([\w-]+\.js)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync('js/'+f,'utf8')+'<\/script>').replace('const SB=(window.supabase','const SB=window.__SB?window.__SB:(window.supabase');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/',beforeParse(win){win.__SB=MOCK}});const w=dom.window;w.addEventListener('error',e=>errs.push(e.message));
const q=s=>w.document.querySelector(s);
(async()=>{await sl(400);
w.history.pushState(null,'','/admin');w.eval('render()');await sl(400);
console.log('stage',w.eval('ADM.stage'),w.eval('ADM.err'),!!q('.adm-qr'),!!q('#admcode'));
q('#admcode').value='123456';await w.admMfaVerify();await sl(300);
console.log('ready',w.eval('ADM.stage'),w.document.querySelectorAll('.adm-nav button').length,'kpis',w.document.querySelectorAll('.adm-k').length,'bars',w.document.querySelectorAll('.adm-bars i').length,'alerts',w.document.querySelectorAll('.adm-al').length,'badge',(q('.adm-nav em')||{}).textContent);
const B=()=>q('#admbody');console.log('dash kpis',w.document.querySelectorAll('.ix-k').length,'links',w.document.querySelectorAll('.ix-k.link').length,'ops',q('.ix-ops').className,q('.ix-ops h2').textContent,'items',w.document.querySelectorAll('.ix-opl li').length,'bars',w.document.querySelectorAll('#achp .ach-b i').length,'empty threads',!!q('#acht .ach-e'),'xlabels',[...w.document.querySelectorAll('#achp .ach-x span')].map(x=>x.textContent).join('|'),'confirmed',[...w.document.querySelectorAll('.ix-kv')].map(x=>x.textContent).join(','));
w.achShow(q('#achp'),29);console.log('tip',q('#achp .ach-tip').textContent);
q('#admrange').value='7';q('#admrange').dispatchEvent(new w.Event('change'));await sl(200);console.log('7d bars',w.document.querySelectorAll('#achp .ach-b i').length,q('.ix-upd').textContent);
w.admCol();console.log('col',q('#adm2').classList.contains('col'));w.admDrawer(true);console.log('drawer',q('#adm2').classList.contains('open'),q('#admmenu').getAttribute('aria-expanded'));w.admDrawer(false);
ZERO=true;await w.admDashLoad();await sl(100);console.log('zero ops',q('.ix-ops h2').textContent,'empty chart',!!q('#achp .ach-e'));ZERO=false;
RANGEOK=false;await w.admDashLoad();await sl(100);console.log('fallback',w.eval('ADM_LIMITED'),q('.ix-upd').textContent.slice(0,80),q('#admrange option[value="7"]').disabled);
for(const t of ['users','reports','rooms','revenue','plans','settings','privacy','staff','audit']){w.admGo(t);await sl(150);const b=q('#admbody');console.log(t,'|',b.querySelector('h1')&&b.querySelector('h1').textContent,'|',b.querySelectorAll('.adm-tr,.adm-card').length,b.textContent.includes('Could not load')?'LOADFAIL '+b.textContent.slice(0,120):'')}
w.admGo('users');await sl(150);await w.admUser('u2');await sl(100);console.log('user modal acts',w.document.querySelectorAll('.adm-u .adm-acts > *').length);
w.admStatusAsk('u2','suspended');await sl(30);await w.admAskGo('');console.log('needs reason:',q('#admaskerr').textContent);q('#admreason').value='Spam links';await w.admAskGo('');await sl(100);console.log('rpc',JSON.stringify(calls.filter(c=>c[1]==='admin_set_status').map(c=>c[2])));
w.admDeleteAsk('u2','spam');await sl(30);q('#admreason').value='request';q('#admtyped').value='delete';await w.admAskGo('DELETE');console.log('typed check:',q('#admaskerr').textContent);w.closeModal();
console.log('free lim',w.eval('freeLim()'),'ann',w.eval('APPSET.announcement&&APPSET.announcement.text'));
w.admGo('plans');await sl(150);w.admPlanSave('free');await sl(30);q('#admreason').value='test';await w.admAskGo('');console.log('plan rpc',JSON.stringify(calls.filter(c=>c[1]==='admin_update_plan').map(c=>c[2])));
console.log('errs',JSON.stringify(errs));process.exit(0)})();
