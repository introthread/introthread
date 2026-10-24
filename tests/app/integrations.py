
import asyncio,json
from playwright.async_api import async_playwright
# --- v56: swap in the test Supabase where const SB is declared (js/supabase-data.js since v104) ---
import builtins as _bi, io as _io
def open(p,*a,**k):
    f=_bi.open(p,*a,**k)
    if isinstance(p,str) and p.endswith('js/supabase-data.js') and 'b' not in (a[0] if a else k.get('mode','r')):
        t=f.read(); f.close()
        return _io.StringIO(t.replace('const SB =\n  window.supabase','const SB = window.__SB ? window.__SB :\n  window.supabase'))
    return f
# --- end v56 ---

async def main():
    html=open('index.html').read().replace('const SB=(window.supabase','const SB=window.__SB?window.__SB:(window.supabase')
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.add_init_script(path='tests/app/mock_integrations.js')
        async def rt(r):
            u=r.request.url
            if u.startswith('https://local.test/') and r.request.resource_type=='document': return await r.fulfill(body=html,content_type='text/html')
            if '/auth/v1/settings' in u: return await r.fulfill(body=json.dumps({'external':{'google':True,'azure':True,'linkedin_oidc':False}}),content_type='application/json')
            if 'supabase' in u: return await r.abort()
            return await r.continue_()
        await pg.route('**/*',rt)
        await pg.goto('https://local.test/');await pg.wait_for_timeout(900)
        await pg.evaluate("demoLogin()");await pg.wait_for_timeout(300)
        await pg.evaluate("go('/app/settings?tab=integrations')");await pg.wait_for_timeout(600)
        rows=lambda: pg.evaluate("[...document.querySelectorAll('.in-row')].map(r=>r.innerText.replace(/\\n/g,' | ')).join(' ## ')")
        print('demo:',await rows())
        await pg.evaluate("MODE='cloud';INTX={ids:null,on:null,loading:false,err:''};render()");await pg.wait_for_timeout(1200)
        print('cloud:',await rows())
        await pg.evaluate("intConnect('azure')");await pg.wait_for_timeout(200);print('link',await pg.evaluate("JSON.stringify(window.__LINK)"))
        await pg.evaluate("window.__LINKERR='Manual linking is disabled';intConnect('google')");await pg.wait_for_timeout(300);print('toast',await pg.evaluate("$('#toast').innerText"))
        await pg.evaluate("intDisconnect('google')");await pg.wait_for_timeout(1200);print('after unlink:',await rows())
        print('errs',errs[:3]);await b.close()
asyncio.run(main())
