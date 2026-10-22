// Introthread - Match celebration (v46): when both people give the same answer to "What's next?",
// the Thread page shows a short celebration once (per Thread, per device) with the next step.
// Loaded after first-visit.js. Prefix mc / MC.
const MC_TXT={meet:{t:'You both want to meet again',b:'Suggest a time while it is fresh. A short, specific message works best.'},
 intro:{t:'You both want an introduction',b:'Write the introduction now, while you both remember the conversation.'},
 keep:{t:'You both want to stay in touch',b:'Send a quick note so the Thread stays warm.'}};
const MC={open:null};
function mcKey(id){return 'it_match_'+id}
function mcClose(write){const el=document.getElementById('mcel');if(el)el.remove();MC.open=null;
 if(write){const d=document.getElementById('draft');if(d){d.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>{try{d.focus()}catch(e){}},300)}}}
function mcShow(t){const x=MC_TXT[t.mine]||MC_TXT.keep,first=esc(String((t.other&&t.other.name)||'They').split(' ')[0]);MC.open=t.id;
 try{localStorage.setItem(mcKey(t.id),'1')}catch(e){}
 const el=document.createElement('div');el.id='mcel';el.className='mc-back';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','mct');
 el.innerHTML=`<div class="mc-card"><div class="mc-burst" aria-hidden="true">${'<i></i>'.repeat(12)}</div><span class="mc-ic" aria-hidden="true">${typeof sv==='function'?sv('check',26,'#fff',3):''}</span>
 <p class="mc-k">It&rsquo;s a match</p><h2 id="mct">${esc(x.t)}</h2><p>${first} picked the same answer as you. ${esc(x.b)}</p>
 <div class="mc-b"><button type="button" class="t-how" onclick="mcClose()">Close</button><button type="button" class="x-btn" onclick="mcClose(true)">${document.getElementById('draft')?'Write the follow-up':'Continue'}</button></div></div>`;
 el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();mcClose()}});el.addEventListener('click',e=>{if(e.target===el)mcClose()});
 document.body.appendChild(el);const b=el.querySelector('.x-btn');if(b)b.focus()}
function mcCheck(){if(MC.open||document.getElementById('mcel')||document.getElementById('ftour'))return;const p=String(RH()||'').replace(/^#/,'').split('/').filter(Boolean);
 if(!(p[0]==='app'&&p[1]==='thread'&&p[2]))return;const t=(DB.threads||[]).find(x=>x.id===p[2]);if(!t||typeof threadState!=='function'||threadState(t)!=='matched')return;
 if(!(t.mine&&t.mine===t.theirs&&t.mine!=='notnow'))return;try{if(localStorage.getItem(mcKey(t.id))==='1')return}catch(e){return}mcShow(t)}
const _render46=render;render=function(){const r=_render46.apply(this,arguments);try{setTimeout(mcCheck,350)}catch(e){}return r};
