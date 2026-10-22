// Introthread - Security (v37): staff sessions end after 30 minutes without activity in the admin area.
// Loaded by index.html after the main script, in this order: rooms-access, admin-idle, room-sessions, billing-sync.
// Uses the main script's globals (render, DB, SB, esc, ...). See ARCHITECTURE.md > Refactor plan.

/* v37 security: staff sessions end after 30 minutes without activity (admin area only). */
(function(){const LIM=30*60*1000;let last=Date.now();const bump=()=>{last=Date.now()};['pointerdown','keydown','scroll','touchstart'].forEach(e=>addEventListener(e,bump,{passive:true}));
 setInterval(async()=>{if(!(location.pathname||'').startsWith('/admin')||Date.now()-last<LIM||!SB)return;last=Date.now();try{await SB.auth.signOut()}catch(e){}try{DB.session=null;save()}catch(e){}toast('Signed out after 30 minutes without activity');go('/login')},60*1000)})();
