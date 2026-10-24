# --- v56: swap in the test Supabase where const SB is declared (js/supabase-data.js since v104) ---
import builtins as _bi, io as _io
def open(p,*a,**k):
    f=_bi.open(p,*a,**k)
    if isinstance(p,str) and p.endswith('js/supabase-data.js') and 'b' not in (a[0] if a else k.get('mode','r')):
        t=f.read(); f.close()
        return _io.StringIO(t.replace('const SB =\n  window.supabase','const SB = window.__SB ? window.__SB :\n  window.supabase'))
    return f
# --- end v56 ---

# Profile photo crop dialog: the Save photo button must be fully visible at every screen size (Playwright).
# Run from the repo root: python3 tests/app/photo_crop.py
# Needs: pip install playwright && python3 -m playwright install chromium.
# Exits with code 1 and lists the failing sizes if Save photo is cut off, covered or scrolled out of view.
# Guards against a regression seen on 22 Oct 2026 (short 1310x640 laptop window: the button was pushed below the dialog).

import asyncio, sys
from playwright.async_api import async_playwright

SIZES = [
    (1920, 1080), (1536, 864), (1366, 768), (1310, 640), (1280, 600), (1280, 520),  # laptops, incl. short windows
    (1024, 600), (768, 1024),                                                        # small laptop, tablet
    (430, 932), (390, 844), (390, 560), (375, 667), (360, 640), (320, 568),          # phones, incl. small ones
]

# Fully visible = inside the viewport, inside every clipping ancestor (the dialog scrolls), and not covered:
# the topmost element at each corner and the centre is the button itself (or something inside it).
CHECK = """(()=>{
  const b=document.getElementById('pcuse');if(!b)return {ok:false,why:'Save photo button not found'};
  const r=b.getBoundingClientRect(),W=innerWidth,H=innerHeight;
  if(!r.width||!r.height)return {ok:false,why:'button has no size'};
  if(r.top<0||r.left<0||r.bottom>H+0.5||r.right>W+0.5)return {ok:false,why:`outside the screen (top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)}, screen ${W}x${H})`};
  for(let p=b.parentElement;p&&p!==document.documentElement;p=p.parentElement){
    const c=getComputedStyle(p);
    if(/(auto|scroll|hidden|clip)/.test(c.overflowY+c.overflowX)){const q=p.getBoundingClientRect();
      if(r.top<q.top-0.5||r.bottom>q.bottom+0.5||r.left<q.left-0.5||r.right>q.right+0.5)
        return {ok:false,why:`clipped by .${String(p.className).split(' ')[0]} (button ${Math.round(r.top)}-${Math.round(r.bottom)}, visible area ${Math.round(q.top)}-${Math.round(q.bottom)})`}}}
  // Inset by the corner radius so rounded corners are not mistaken for something covering the button.
  const rad=Math.min(parseFloat(getComputedStyle(b).borderTopLeftRadius)||0,r.height/2),ix=Math.max(3,rad*0.5+2),iy=Math.max(3,Math.min(rad*0.5+2,r.height/2-1));
  const pts=[[r.left+ix,r.top+iy],[r.right-ix,r.top+iy],[r.left+ix,r.bottom-iy],[r.right-ix,r.bottom-iy],[(r.left+r.right)/2,(r.top+r.bottom)/2],[r.left+3,(r.top+r.bottom)/2],[r.right-3,(r.top+r.bottom)/2]];
  for(const [x,y] of pts){const e=document.elementFromPoint(x,y);if(!e||!(e===b||b.contains(e)))return {ok:false,why:`covered at (${Math.round(x)},${Math.round(y)}) by ${e?e.tagName+'.'+String(e.className).split(' ')[0]:'nothing'}`}}
  return {ok:true,why:`visible at ${Math.round(r.top)}-${Math.round(r.bottom)} of ${H}`}})()"""

# Opens the real dialog (pcOpen) with a generated landscape picture, as after choosing a photo in Settings.
OPEN = """(()=>{const c=document.createElement('canvas');c.width=1600;c.height=1000;const x=c.getContext('2d');x.fillStyle='#3157ff';x.fillRect(0,0,1600,1000);
  const im=new Image();im.src=c.toDataURL();return new Promise(res=>{im.onload=()=>{PCROP={im,url:'',live:false,z:1,x:0,y:0};pcOpen();res(true)}})})()"""

async def main():
    html = open('index.html').read()
    fails, errs = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for W, H in SIZES:
            pg = await b.new_page(viewport={'width': W, 'height': H})
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            await pg.route('**/*', lambda r: r.fulfill(body=html, content_type='text/html') if r.request.url.startswith('https://local.test/') and r.request.resource_type == 'document' else r.fulfill(body=open(r.request.url.split('local.test/', 1)[1].split('?')[0]).read(), content_type=('text/css' if '.css' in r.request.url else 'application/javascript')) if r.request.url.startswith(('https://local.test/js/','https://local.test/css/')) else r.abort() if 'supabase' in r.request.url else r.continue_())
            await pg.goto('https://local.test/'); await pg.wait_for_timeout(700)
            await pg.evaluate('demoLogin()'); await pg.wait_for_timeout(300)
            await pg.evaluate("go('/app/settings')"); await pg.wait_for_timeout(500)
            await pg.evaluate(OPEN); await pg.wait_for_timeout(600)
            # Also check after zooming in, which redraws the picture.
            res = [await pg.evaluate(CHECK)]
            await pg.evaluate("(()=>{const z=document.getElementById('pcz');if(z){z.value=3;z.dispatchEvent(new Event('input',{bubbles:true}))}})()"); await pg.wait_for_timeout(200)
            res.append(await pg.evaluate(CHECK))
            ok = all(x['ok'] for x in res)
            print(f"{'PASS' if ok else 'FAIL'} {W}x{H}: {res[0]['why'] if ok else next(x['why'] for x in res if not x['ok'])}")
            if not ok: fails.append(f'{W}x{H}')
            await pg.close()
        await b.close()
    print('errs', errs[:5])
    if fails or errs:
        print('FAILED:', ', '.join(fails) or 'page errors'); sys.exit(1)
    print(f'All {len(SIZES)} sizes passed: Save photo is fully visible.')

asyncio.run(main())
