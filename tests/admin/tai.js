
process.env.GEMINI_API_KEY='gk';
let req=null,mode='ok';
global.fetch=async(u,o={})=>{const J=b=>({ok:true,status:200,json:async()=>b});
 if(u.includes('generativelanguage')){req={u,o};if(mode==='fail')return{ok:false,status:429,json:async()=>({}),text:async()=>'quota'};if(mode==='bad')return{ok:false,status:400,json:async()=>({}),text:async()=>'bad model'};return J({candidates:[{content:{parts:[{text:'Hi Sam, '},{text:'great meeting you. Agnes'}]}}]});}
 if(u.includes('/auth/v1/user'))return J({id:'u1'});
 if(u.includes('/rpc/my_profile'))return J({name:'Agnes W',role:'CEO',company:'X',handle:'agnes',prefs:{}});
 if(u.includes('/rest/v1/threads'))return J([{owner_id:'u1',other_name:'Sam',where_met:'In person',note:'SECRET NOTE',mine:'meet',theirs:'meet',created_at:'2026-10-26'}]);
 return{ok:false,status:404,json:async()=>({})};};
const h=require('/home/user/introthread/api/ai-draft.js');
const call=()=>new Promise(res=>{const r={statusCode:0,setHeader(){},end(s){res([this.statusCode,JSON.parse(s)]);}};h({method:'POST',url:'/api/ai-draft',headers:{authorization:'Bearer a.b.c',apikey:'a.b.c'},body:{thread_id:'11111111-1111-1111-1111-111111111111'},socket:{}},r);});
(async()=>{const errs=[];const ck=(c,m)=>{if(!c)errs.push(m)};
 let r=await call();ck(r[0]===200&&r[1].draft==='Hi Sam, great meeting you. Agnes','draft '+JSON.stringify(r));
 ck(req&&req.u.includes('models/gemini-2.5-flash:generateContent')&&req.o.headers['x-goog-api-key']==='gk','request');
 const b=JSON.parse(req.o.body);ck(!req.o.body.includes('SECRET NOTE'),'note withheld on free Gemini');ck(b.system_instruction&&b.contents[0].parts[0].text.includes('Recipient: Sam')&&b.generationConfig.thinkingConfig.thinkingBudget===0,'body');
 mode='fail';r=await call();ck(r[0]===502&&r[1].error==='busy'&&r[1].status===429,'busy '+JSON.stringify(r));
 mode='bad';r=await call();ck(r[0]===502&&r[1].error==='provider'&&r[1].status===400,'provider '+JSON.stringify(r));
 delete process.env.GEMINI_API_KEY;r=await call();ck(r[0]===503,'not configured');
 console.log('errs',JSON.stringify(errs));})();
