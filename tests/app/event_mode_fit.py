# --- v56: swap in the test Supabase where const SB is declared (js/supabase-data.js since v104) ---
import builtins as _bi, io as _io
def open(p,*a,**k):
    f=_bi.open(p,*a,**k)
    if isinstance(p,str) and p.endswith('js/supabase-data.js') and 'b' not in (a[0] if a else k.get('mode','r')):
        t=f.read(); f.close()
        return _io.StringIO(t.replace('const SB =\n  window.supabase','const SB = window.__SB ? window.__SB :\n  window.supabase'))
    return f
# --- end v56 ---

# Event mode (/app/scan): the Share, NFC, Wallpaper and Add manually buttons and the tip must be fully
# visible on every phone size without scrolling (Playwright). Run from the repo root: python3 tests/app/event_mode_fit.py
# Guards against the 26 Oct 2026 report: on a 360px Android phone with the browser bar showing, the button row
# was cut off at the bottom and needed a scroll.

import asyncio, sys
from playwright.async_api import async_playwright

SIZES = [
    (430, 932), (414, 736), (393, 660), (390, 844), (390, 664), (375, 667), (375, 560),
    (360, 780), (360, 640), (360, 600), (412, 715), (320, 568), (768, 1024), (1366, 768),
]

CHECK = """(()=>{
  const ev=document.querySelector('.ev2');if(!ev)return {ok:false,why:'event mode not shown'};
  const H=innerHeight,W=innerWidth;
  if(ev.scrollHeight>ev.clientHeight+1)return {ok:false,why:`screen scrolls by ${ev.scrollHeight-ev.clientHeight}px`};
  if(document.scrollingElement.scrollHeight>H+1)return {ok:false,why:'page scrolls'};
  const els=[...document.querySelectorAll('.ev2-bar > *'),document.querySelector('.ev2-tip'),document.querySelector('#scanqr img, #scanqr div')];
  if(els.length<6)return {ok:false,why:'missing buttons'};
  for(const e of els){if(!e)return {ok:false,why:'missing element'};const r=e.getBoundingClientRect();
    if(!r.width||!r.height)return {ok:false,why:'element has no size'};
    if(r.top<0||r.left<0||r.bottom>H+0.5||r.right>W+0.5)return {ok:false,why:`${(e.innerText||e.tagName).trim().split('\\n')[0]} outside the screen (bottom ${Math.round(r.bottom)} of ${H})`};
    if(e.closest('#scanqr'))continue;
    const x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,h=document.elementFromPoint(x,y);
    if(!h||!(h===e||e.contains(h)))return {ok:false,why:`${(e.innerText||e.tagName).trim()} covered`}}
  const q=document.querySelector('#scanqr img, #scanqr div').getBoundingClientRect();
  return {ok:true,why:`buttons end at ${Math.round(document.querySelector('.ev2-bar').getBoundingClientRect().bottom)} of ${H}, QR ${Math.round(q.width)}px`}})()"""

async def main():
    html = open('index.html').read()
    fails, errs = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for W, H in SIZES:
            for long_ in (False, True):
                pg = await b.new_page(viewport={'width': W, 'height': H})
                pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
                await pg.route('**/*', lambda r: r.fulfill(body=html, content_type='text/html') if r.request.url.startswith('https://local.test/') and r.request.resource_type == 'document' else r.fulfill(body=open(r.request.url.split('local.test/', 1)[1].split('?')[0]).read(), content_type=('text/css' if '.css' in r.request.url else 'application/javascript')) if r.request.url.startswith(('https://local.test/js/','https://local.test/css/')) else r.abort() if 'supabase' in r.request.url else r.continue_())
                await pg.goto('https://local.test/'); await pg.wait_for_function('typeof demoLogin==="function"')
                await pg.evaluate('demoLogin()'); await pg.wait_for_function('typeof me==="function" && !!me()')
                if long_:  # long name and job title, as on a real card
                    await pg.evaluate("(()=>{const u=me();u.name='Wanjiku Kamau-Ochieng';u.role='Head of Strategic Partnerships';u.company='East Africa Development Holdings'})()")
                await pg.evaluate("go('/app/scan')")
                await pg.wait_for_selector('.ev2 #scanqr img, .ev2 #scanqr div')
                await pg.wait_for_timeout(250)
                r = await pg.evaluate(CHECK)
                tag = f"{W}x{H}{' long name' if long_ else ''}"
                print(f"{'PASS' if r['ok'] else 'FAIL'} {tag}: {r['why']}")
                if not r['ok']: fails.append(tag)
                await pg.close()
        await b.close()
    print('errs', errs[:5])
    if fails or errs:
        print('FAILED:', ', '.join(fails) or 'page errors'); sys.exit(1)
    print(f'All {len(SIZES)*2} checks passed: event mode buttons fully visible without scrolling.')

asyncio.run(main())
