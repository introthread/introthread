"""Pre-render the public website pages (v58).

Run AFTER scripts/build_pages.py:
    python3 scripts/build_pages.py && python3 scripts/prerender.py

For each marketing page it loads the built HTML in headless Chromium (logged out,
no network), waits for the app to draw it, and saves the result inside
<div id="root"> between <!--pre--> markers. Visitors and search engines then see
the real text before any script runs; the app redraws the same content on load.
App, admin and card routes use app-shell.html (empty root), so they never show it.
Login and signup are not pre-rendered: they change with sign-in options.
Needs: pip install playwright && playwright install chromium
"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = {'/': 'index.html', '/how': 'how/index.html', '/rooms': 'rooms/index.html',
         '/networks': 'networks/index.html', '/pricing': 'pricing/index.html',
         '/about': 'about/index.html', '/privacy': 'privacy/index.html', '/terms': 'terms/index.html'}
TYPES = {'.js': 'application/javascript', '.css': 'text/css'}


def local(path):
    f = os.path.join(ROOT, path.lstrip('/'))
    return f if os.path.isfile(f) else None


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        for url, file in PAGES.items():
            fp = os.path.join(ROOT, file)
            html = re.sub(r'<div id="root">.*?<!--/pre--></div>', '<div id="root"></div>', open(fp).read(), flags=re.S)

            def make_handler(html):
              def handle(route, _request=None):
                  req = route.request
                  path = req.url.split('://', 1)[-1].split('/', 1)[-1].split('?')[0]
                  if req.resource_type == 'document':
                      return route.fulfill(body=html, content_type='text/html')
                  f = local(path)
                  if f and os.path.splitext(f)[1] in TYPES:
                      return route.fulfill(body=open(f, 'rb').read(), content_type=TYPES[os.path.splitext(f)[1]])
                  return route.abort()

              return handle

            pg = b.new_page(viewport={'width': 1366, 'height': 900})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route('**/*', make_handler(html))
            pg.goto('http://local.test' + url)
            pg.wait_for_function("document.querySelector('#root') && document.querySelector('#root').children.length>0", timeout=15000)
            pg.wait_for_timeout(800)
            inner = pg.eval_on_selector('#root', 'e=>e.innerHTML')
            pg.close()
            if errs:
                sys.exit(f'{url}: script error while pre-rendering: {errs[0]}')
            out = html.replace('<div id="root"></div>', '<div id="root"><!--pre-->' + inner + '<!--/pre--></div>', 1)
            open(fp, 'w').write(out)
            print(f'{url}: {len(inner)//1024} KB of page text')
        b.close()


if __name__ == '__main__':
    main()
