# Generates per-page HTML copies with page-specific meta for crawlers (LinkedIn, WhatsApp, X).
import re, json, os
SITE='https://www.introthread.com'
META={
 '/':('Introthread | Every handshake, followed through','Create your professional card, share it by tap, QR or link, and turn every introduction into a shared Thread with one clear next step. Built for professionals everywhere.'),
 '/how':('How it works | Introthread','Tap or scan, confirm a shared Thread, answer one private question: What\'s next? See how Introthread turns introductions into follow-through.'),
 '/rooms':('Thread Rooms for events and communities | Introthread','Measure what your event created: verified connections, meetings booked and introductions made, live and for 30 days after.'),
 '/networks':('Warmth for teams and networks | Introthread','Consented, verified relationship strength for VC platform teams, accelerators and professional communities. Warm intros that are actually warm.'),
 '/pricing':('Pricing | Introthread','Start free with your card, link, QR and unlimited Threads. Pro for people who follow through, Rooms from $166 per event, custom plans for networks.'),
 '/about':('About | Introthread','Introthread records the moment two people meet and agree on what happens next. Our story, and how to get in touch.'),
 '/privacy':('Trust and privacy | Introthread','Two-sided consent, private answers and opt-in network visibility. Designed for UK GDPR, the DPA 2018 and US state privacy laws.'),
 '/terms':('Terms of Service | Introthread','The terms for using Introthread: your account, your content, acceptable use, plans and payments, and your rights.'),
 '/login':('Log in | Introthread','Log in to Introthread and pick up every Thread where you left it.'),
 '/signup':('Create your free card | Introthread','Create your free Introthread card in 60 seconds. No card required.'),
}
def esc(s): return s.replace('&','&amp;').replace('"','&quot;').replace('<','&lt;')
def block(path):
    t,d=META[path];url=SITE+(path if path!='/' else '/')
    return f'''<!--meta-->
<title>{esc(t)}</title>
<meta name="description" content="{esc(d)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Introthread">
<meta property="og:title" content="{esc(t)}">
<meta property="og:description" content="{esc(d)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/img/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(t)}">
<meta name="twitter:description" content="{esc(d)}">
<meta name="twitter:image" content="{SITE}/img/og.jpg">
<!--/meta-->'''
h=open('index.html').read()
if '<!--meta-->' not in h:
    i=h.index('<title>');j=h.index('<meta name="theme-color"')
    h=h[:i]+block('/')+'\n'+h[j:]
else:
    h=re.sub(r'<!--meta-->.*?<!--/meta-->',lambda m:block('/'),h,flags=re.S)
h=h.replace('<meta name="theme-color" content="#0f1218">','<meta name="theme-color" content="#0b1122">')
# JS meta map for client-side navigation
jsmap='const PAGE_META='+json.dumps({k:list(v) for k,v in META.items()})+';'
h=re.sub(r'const PAGE_META=\{.*?\};',lambda m:jsmap,h,flags=re.S) if 'const PAGE_META=' in h else h

# --- v57 speed: defer every script (order is kept) and add a content hash to
# /js and /css links so browsers can cache them for a year (see vercel.json).
import hashlib
def _ver(m):
    tag,attr,path=m.group(1),m.group(2),m.group(3)
    hv=hashlib.sha1(open(path,'rb').read()).hexdigest()[:10]
    return f'{tag}{attr}="/{path}?v={hv}"'
h=re.sub(r'(<(?:script|link rel="stylesheet")[^>]*?\s)(src|href)="/((?:js|css)/[\w-]+\.(?:js|css))(?:\?v=\w+)?"',_ver,h)
h=re.sub(r'<script (?!type=)(?![^>]*\bdefer\b)([^>]*)></script>',r'<script \1 defer></script>',h)
# --- end v57
open('index.html','w').write(h)
for p in META:
    if p=='/':continue
    os.makedirs(p[1:],exist_ok=True)
    open(p[1:]+'/index.html','w').write(re.sub(r'<!--meta-->.*?<!--/meta-->',lambda m:block(p),h,flags=re.S))
print('built',len(META))
