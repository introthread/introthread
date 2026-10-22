// Introthread - Sessions (v39): attendance for each session of a repeating Room (migration 017).
// Loaded by index.html after the main script, in this order: rooms-access, admin-idle, room-sessions, billing-sync.
// Uses the main script's globals (render, DB, SB, esc, ...). See ARCHITECTURE.md > Refactor plan.

/* v39 Sessions: attendance for each session of a repeating Room (needs migration 017). Prefix ses / SESX. */
const SESX={};
const sesD=d=>new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
function sesBox(id){const r=DB.rooms.find(x=>x.id===id);if(!r)return'';const m=rm9(r);if(!m.repeat)return'';
 if(!cloud())return `<div class="card pad ra-box ses-box" id="sesb"><h3>Sessions</h3><p class="muted small">Check-ins for each session show here on the live site.</p></div>`;
 const S=SESX[id];if(!S){SESX[id]={loading:true};sesLoad(id)}
 if(!S||S.loading)return `<div class="card pad ra-box ses-box" id="sesb"><h3>Sessions</h3><p class="muted small">Loading...</p></div>`;
 if(S.off)return '';if(S.err)return `<div class="card pad ra-box ses-box" id="sesb"><h3>Sessions</h3><p class="muted small">${esc(S.err)}</p></div>`;
 const d=S.data,L=d.sessions||[],own=d.is_owner,today=L.find(x=>x.today);
 let h=`<div class="card pad ra-box ses-box" id="sesb"><div class="row between"><h3>Sessions</h3><span class="ra-c">${raRep(d.repeat)}${d.next?' &middot; next '+esc(sesD(d.next)):''}</span></div>`;
 if(today)h+=today.me?`<p class="rj-ok">You are checked in for today.</p>`:`<button type="button" class="x-btn" onclick="sesCheck('${id}',this)">Check in to today's session</button>`;
 h+=L.length?`<ul class="ra-l">${L.map(x=>`<li><span class="ra-w"><b>${esc(sesD(x.date))}${x.today?' (today)':''}</b><small>${+x.count||0} of ${+d.members||0} attended${x.me?' &middot; you were there':''}</small></span>${own?`<span class="ra-b"><button type="button" class="t-how sm" onclick="sesOpen('${id}','${esc(x.date)}')" aria-expanded="${S.open===x.date}">${S.open===x.date?'Close':'Attendance'}</button></span>`:''}</li>${own&&S.open===x.date?`<li class="ses-p">${S.people?(S.people.length?S.people.map(u=>`<label class="ses-m"><input type="checkbox" ${u.attended?'checked':''} onchange="sesMark('${id}','${esc(u.id)}','${esc(x.date)}',this.checked)"> <span>${esc(u.name||'Member')}</span></label>`).join(''):'<span class="muted small">No members yet.</span>'):'<span class="muted small">Loading...</span>'}</li>`:''}`).join('')}</ul>`:`<p class="muted small">The first session has not happened yet.</p>`;
 return h+`</div>`}
async function sesLoad(id){try{const {data,error}=await SB.rpc('room_sessions',{p_room:id,p_limit:8});const keep=SESX[id]&&SESX[id].open?{open:SESX[id].open,people:SESX[id].people}:{};if(error)SESX[id]=/function|schema cache/i.test(error.message||'')?{off:true}:{err:error.message};else SESX[id]=Object.assign(keep,{data})}catch(e){SESX[id]={err:'Could not load sessions.'}}if(raPath().includes('/app/room/'+id)){window._keepScroll=true;render()}}
async function sesCheck(id,b){if(b)b.disabled=true;const {data,error}=await SB.rpc('room_checkin',{p_room:id});if(error){if(b)b.disabled=false;return toast(error.message)}toast(data==='ok'?'Checked in':'There is no session today');delete SESX[id];window._keepScroll=true;render()}
async function sesOpen(id,d){const S=SESX[id];if(!S||!S.data)return;if(S.open===d){S.open=null;S.people=null;window._keepScroll=true;return render()}S.open=d;S.people=null;window._keepScroll=true;render();const {data,error}=await SB.rpc('room_session_people',{p_room:id,p_date:d});if(error)return toast(error.message);if(SESX[id]&&SESX[id].open===d){SESX[id].people=data||[];window._keepScroll=true;render()}}
async function sesMark(id,u,d,on){const {error}=await SB.rpc('room_attendance_set',{p_room:id,p_user:u,p_date:d,p_on:on});if(error)return toast(error.message);const S=SESX[id];if(S&&S.data){const x=(S.data.sessions||[]).find(z=>z.date===d);if(x)x.count=Math.max(0,(+x.count||0)+(on?1:-1));const pp=(S.people||[]).find(z=>z.id===u);if(pp)pp.attended=on}window._keepScroll=true;render()}
function sesPost(){const p=raPath().split('/').filter(Boolean);if(!(p[0]==='app'&&p[1]==='room'&&p[2]))return;const html=sesBox(p[2]),old=$('#sesb');
 if(old){if(html)old.outerHTML=html;else old.remove();return}if(!html)return;const a=$('#rab')||document.querySelector('.ra-box');if(a)a.insertAdjacentHTML('afterend',html);else{const st=document.querySelector('.ro-strip');(st&&st.parentNode||$('#root')).insertAdjacentHTML('beforeend',html)}}
const _render39=render;render=function(){const r=_render39.apply(this,arguments);try{sesPost()}catch(e){console.error(e)}return r};
