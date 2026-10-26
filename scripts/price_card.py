"""Draws img/brand/price-card.png from PLANS (v139).

Renders the plan cards and UK note of the built /pricing page (pricing/index.html, which reads PLANS and
GBP) in headless Chromium at 2x and saves them as the price card. scripts/build_pages.py calls redraw_if_needed()
on every build; the card is redrawn only when the prices in img/brand/price-card.json differ from PLANS/GBP
(or with --force), so unchanged builds do not rewrite the image.
Needs: pip install playwright && python3 -m playwright install chromium
"""
import os, re, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'img/brand/price-card.png')
STAMP = os.path.join(ROOT, 'img/brand/price-card.json')
TYPES = {'.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2'}


def draw(P):
    from playwright.sync_api import sync_playwright
    html = re.sub(r'<div id="root">.*?<!--/pre--></div>', '<div id="root"></div>', open(os.path.join(ROOT, 'pricing/index.html')).read(), flags=re.S)

    def handle(route):
        req = route.request
        path = req.url.split('://', 1)[-1].split('/', 1)[-1].split('?')[0]
        if req.resource_type == 'document':
            return route.fulfill(body=html, content_type='text/html')
        f = os.path.join(ROOT, path)
        if os.path.isfile(f) and os.path.splitext(f)[1] in TYPES:
            return route.fulfill(body=open(f, 'rb').read(), content_type=TYPES[os.path.splitext(f)[1]])
        return route.abort()

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1366, 'height': 1000}, device_scale_factor=2)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/*', handle)
        pg.goto('http://local.test/pricing')
        pg.wait_for_selector('.x-plans .x-plan-a')
        pg.wait_for_timeout(600)
        # check the page shows the PLANS figures before saving
        txt = pg.eval_on_selector('.x-plans', 'e=>e.innerText')
        for want in ('$%d' % P['pro_m'], '$%d' % P['rooms']):
            if want not in txt:
                sys.exit(f'price card: {want} not on the rendered pricing page')
        box = pg.evaluate("""(()=>{const a=document.querySelector('.x-plans').getBoundingClientRect(),n=document.querySelector('.x-plan-note').getBoundingClientRect();
          const x=Math.min(a.left,n.left)-24,y=a.top-34+scrollY;return {x:Math.max(0,x),y:Math.max(0,y),width:Math.max(a.right,n.right)-x+24,height:n.bottom+scrollY-y+20}})()""")
        pg.screenshot(path=OUT, clip=box, full_page=True)
        b.close()
        if errs:
            sys.exit('price card: script error: ' + errs[0])


def redraw_if_needed(P, force=False):
    want = {k: P[k] for k in ('free_m', 'free_threads', 'pro_m', 'gbp_pro_m', 'rooms', 'gbp_rooms')}
    have = json.load(open(STAMP)) if os.path.exists(STAMP) else None
    if not force and have == want and os.path.exists(OUT):
        return False
    draw(P)
    json.dump(want, open(STAMP, 'w'), indent=1)
    open(STAMP, 'a').write('\n')
    return True


if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from pricing import load
    print('redrawn' if redraw_if_needed(load(), force='--force' in sys.argv) else 'unchanged')
