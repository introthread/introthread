
import asyncio,json
from playwright.async_api import async_playwright
async def main():
    html=open('index.html').read()
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
        await pg.route('**/*',lambda r: r.fulfill(body=html,content_type='text/html') if r.request.url.startswith('https://local.test/') and r.request.resource_type=='document' else r.abort() if ('supabase' in r.request.url or 'nominatim' in r.request.url) else r.continue_())
        await pg.goto('https://local.test/');await pg.wait_for_timeout(1000)
        await pg.evaluate("demoLogin()");await pg.wait_for_timeout(400)
        async def mk(name):
            await pg.evaluate("go('/app/tap')");await pg.wait_for_timeout(500)
            await pg.evaluate(f"$('#tn').value='{name}';$('#te').value='{name.split()[0].lower()}@example.com'")
            await pg.evaluate("(()=>{const f=$('#tn').closest('form');f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true}))})()")
            await pg.wait_for_timeout(2500)
            return await pg.evaluate(f"(DB.threads.find(x=>x.other&&x.other.name==='{name}')||{{}}).id")
        async def st(i,label):
            s=await pg.evaluate(f"threadState(findThread('{i}'))")
            await pg.evaluate(f"go('/app/thread/{i}')");await pg.wait_for_timeout(500)
            txt=await pg.evaluate("document.querySelector('main')?document.querySelector('main').innerText.slice(0,160).replace(/\\n/g,' | '):'NO MAIN'")
            g=await pg.evaluate(f"(()=>{{try{{return vGuest('{i}').replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').slice(0,140)}}catch(e){{return 'ERR '+e.message}}}})()")
            print(f'[{label}] state={s} | page: {txt[:120]} | guest: {g}')
        a=await mk('Jane Wanjiru');await pg.evaluate("go('/app')");await pg.wait_for_timeout(400)
        print('badge0',await pg.evaluate("(document.querySelector('.t-bell .nf-n')||{}).textContent||'none'"))
        await pg.evaluate(f"guestConfirm('{a}')");await pg.wait_for_timeout(200);await pg.evaluate(f"guestAnswer('{a}','meet')");await pg.evaluate("go('/app')");await pg.wait_for_timeout(400)
        print('badge1',await pg.evaluate("(document.querySelector('.t-bell .nf-n')||{}).textContent||'none'"))
        await pg.evaluate("showNudges()");await pg.wait_for_timeout(300)
        print('feed',await pg.evaluate("[...document.querySelectorAll('.nf-l li')].slice(0,5).map(l=>l.innerText.replace(/\\n/g,' ')).join(' || ')"))
        await pg.evaluate("closeModal();nfBadge()");print('badge2',await pg.evaluate("(document.querySelector('.t-bell .nf-n')||{}).textContent||'none'"))
        await pg.evaluate("go('/app/settings?tab=notifications')");await pg.wait_for_timeout(500)
        print('settings',await pg.evaluate("document.querySelector('main').innerText.includes('When they answer')"))
        print('errs',errs[:5]);await b.close()
asyncio.run(main())
