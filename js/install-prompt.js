// Introthread - Install-as-app prompt (v47). On phones, after a few visits (or the first Thread), offers
// "Add Introthread to your home screen". Android/Chrome: one-tap install through the browser's own prompt.
// iPhone/iPad Safari (no install prompt): short Share > Add to Home Screen steps. Never shown when already
// installed, in the admin area, or for 30 days after "Not now". Loaded after match-celebrate.js. Prefix ip / IP.
const IP={evt:null,shown:false};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();IP.evt=e});
addEventListener('appinstalled',()=>{IP.evt=null;ipHide(true)});
(function(){try{const v=+(localStorage.getItem('it_visits')||0)+1;localStorage.setItem('it_visits',String(v))}catch(e){}})();
const ipIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const ipStandalone=()=>(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
function ipHide(forever){const el=document.getElementById('ipbar');if(el)el.remove();IP.shown=false;
 try{localStorage.setItem('it_install_snooze',String(forever?Date.now()+3650*864e5:Date.now()+30*864e5))}catch(e){}}
async function ipGo(){if(IP.evt){const e=IP.evt;IP.evt=null;try{e.prompt();const c=await e.userChoice;ipHide(c&&c.outcome==='accepted')}catch(_){ipHide()}return}
 const el=document.getElementById('ipbar');if(el)el.querySelector('.ip-t').innerHTML=`<b>Add to your home screen</b><span>In Safari, tap the Share button (the square with an arrow), then <b>Add to Home Screen</b>.</span>`}
function ipCheck(){if(IP.shown||document.getElementById('ipbar')||ipStandalone())return;if(!(me&&me()))return;
 const p=String(RH()||'').replace(/^#/,'');if(!p.startsWith('/app'))return;
 if(!(window.matchMedia&&matchMedia('(max-width: 900px)').matches))return;
 if(!IP.evt&&!ipIOS())return;
 try{if(+(localStorage.getItem('it_install_snooze')||0)>Date.now())return;const v=+(localStorage.getItem('it_visits')||0);if(v<3&&!(typeof myThreads==='function'&&myThreads().length))return}catch(e){return}
 if(document.getElementById('ftour')||document.getElementById('mcel'))return;const mb=document.getElementById('mback');if(mb&&mb.classList.contains('open'))return;
 IP.shown=true;const el=document.createElement('div');el.id='ipbar';el.className='ip-bar';el.setAttribute('role','region');el.setAttribute('aria-label','Install Introthread');
 el.innerHTML=`<img src="/img/icon-192.png" alt="" width="36" height="36"><div class="ip-t"><b>Get the Introthread app</b><span>Open it from your home screen, full screen, in one tap.</span></div><div class="ip-a"><button type="button" class="x-btn sm" onclick="ipGo()">${IP.evt?'Install':'How'}</button><button type="button" class="ip-x" aria-label="Not now" onclick="ipHide()">&times;</button></div>`;
 document.body.appendChild(el)}
const _render47=render;render=function(){const r=_render47.apply(this,arguments);try{setTimeout(ipCheck,1500)}catch(e){}return r};
