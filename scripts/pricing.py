"""Single source of pricing (v139).

PLANS in js/billing.js and the GBP table in js/contacts-import.js are the only places prices are typed.
scripts/build_pages.py calls check_and_generate() on every build:
  * generates the prices block in HANDOVER.md (between <!-- prices:start --> and <!-- prices:end -->)
    and the /pricing meta description;
  * validates the prices written in PRD.md, the Help text (js/data-export.js), the in-app page
    description (js/site-pages.js) and supabase/migrations/019_pricing.sql;
  * fails the build (SystemExit) listing every place that disagrees.
To change a price: edit PLANS and/or GBP, run the build, and fix whatever it lists.
"""
import re, os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf-8').write(s)


def load():
    b = rd('js/billing.js')
    plans = b[b.index('const PLANS = {'):b.index('const FEATURES')]
    def blk(name):
        m = re.search(r'\n  %s: \{(.*?)\n  \}' % name, plans, re.S)
        if not m: raise SystemExit(f'pricing: PLANS.{name} not found in js/billing.js')
        return m.group(1)
    num = lambda s, k: int(re.search(r'\b%s: (\d+)' % k, s).group(1))
    fr, pr, rm = blk('free'), blk('pro'), blk('rooms')
    g = re.search(r'const GBP = \{([^}]*)\};', rd('js/contacts-import.js'))
    if not g: raise SystemExit('pricing: GBP table not found in js/contacts-import.js')
    gbp = {int(k): int(v) for k, v in re.findall(r'(\d+)\s*:\s*(\d+)', g.group(1))}
    P = {
        'free_m': num(fr, 'month'), 'free_y': num(fr, 'year'),
        'free_threads': int(re.search(r"'(\d+) new Threads a month'", fr).group(1)),
        'pro_m': num(pr, 'month'), 'pro_y': num(pr, 'year'), 'rooms': num(rm, 'event'),
    }
    for k in ('pro_m', 'pro_y', 'rooms'):
        if P[k] not in gbp: raise SystemExit(f'pricing: GBP table has no entry for ${P[k]} ({k})')
        P['gbp_' + k] = gbp[P[k]]
    P['gbp_free_m'] = gbp.get(P['free_m'], 0)
    return P


def meta_pricing(P):
    return (f"Start free with your card, link, QR and {P['free_threads']} new Threads a month. "
            f"Pro is ${P['pro_m']} a month for unlimited Threads, Rooms are ${P['rooms']} per event, "
            f"and Networks get custom annual plans.")


def handover_block(P):
    return ('<!-- prices:start -->\n'
            '**Current prices** (generated from `PLANS` in `js/billing.js` and `GBP` in `js/contacts-import.js` '
            'by `scripts/build_pages.py`; do not edit by hand, change `PLANS`/`GBP` and rebuild):\n'
            f"- Free: ${P['free_m']}, {P['free_threads']} new Threads a month\n"
            f"- Pro: ${P['pro_m']} / £{P['gbp_pro_m']} a month; ${P['pro_y']} / £{P['gbp_pro_y']} a year\n"
            f"- Room pass: ${P['rooms']} / £{P['gbp_rooms']} per event (KES = ${P['rooms']} x `KES_PER_USD`)\n"
            '- `img/brand/price-card.png` is drawn by the build from these figures (`scripts/price_card.py`).\n'
            '<!-- prices:end -->')


def checks(P):
    """(file, regex, expected groups as strings, what) - every regex must match at least once and every match must agree."""
    s = lambda *a: tuple(str(x) for x in a)
    return [
        ('PRD.md', r'\*\*Free:\*\* \$(\d+) forever\..*?(\d+) new Threads a month', s(P['free_m'], P['free_threads']), 'Free plan line'),
        ('PRD.md', r'\*\*Pro:\*\* \$(\d+) a month \(£(\d+) in the UK\)', s(P['pro_m'], P['gbp_pro_m']), 'Pro plan line'),
        ('PRD.md', r'\*\*Rooms:\*\* \$(\d+) per event \(£(\d+) in the UK\)', s(P['rooms'], P['gbp_rooms']), 'Rooms plan line'),
        ('js/data-export.js', r'Free includes (\d+) new Threads a month', s(P['free_threads']), 'Help: stop paying answer'),
        ('js/site-pages.js', r"QR and (\d+) new Threads a month\. Pro is \$(\d+) a month for unlimited Threads, Rooms are \$(\d+) per event", s(P['free_threads'], P['pro_m'], P['rooms']), 'in-app /pricing description'),
        ('supabase/migrations/019_pricing.sql', r'Free: \$(\d+) forever, (\d+) new Threads a month\. Pro: \$(\d+) a month \(GBP (\d+)\)\. Rooms: \$(\d+) per event \(GBP (\d+)\)', s(P['free_m'], P['free_threads'], P['pro_m'], P['gbp_pro_m'], P['rooms'], P['gbp_rooms']), 'header comment'),
        ('supabase/migrations/019_pricing.sql', r'Yearly Pro stays \$(\d+) \(GBP (\d+)', s(P['pro_y'], P['gbp_pro_y']), 'yearly comment'),
        ('supabase/migrations/019_pricing.sql', r"price_usd_month = (\d+), price_usd_year = (\d+), price_gbp_month = (\d+), price_gbp_year = (\d+), threads_per_month = 5\b", s(P['free_m'], P['free_y'], P['gbp_free_m'], 0), 'Free plan row'),
        ('supabase/migrations/019_pricing.sql', r"threads_per_month = (\d+)\s*\n", s(P['free_threads']), 'Free Thread limit'),
        ('supabase/migrations/019_pricing.sql', r"price_usd_month = (\d+), price_usd_year = (\d+), price_gbp_month = (\d+), price_gbp_year = (\d+), threads_per_month = null", s(P['pro_m'], P['pro_y'], P['gbp_pro_m'], P['gbp_pro_y']), 'Pro plan row'),
    ]


def check_and_generate(write=True):
    P = load()
    errs = []
    # generated: HANDOVER prices block
    h = rd('HANDOVER.md')
    blk = handover_block(P)
    if '<!-- prices:start -->' in h:
        h2 = re.sub(r'<!-- prices:start -->.*?<!-- prices:end -->', lambda m: blk, h, flags=re.S)
    else:
        i = h.index('\n## ') if '\n## ' in h else len(h)
        h2 = h[:i] + '\n\n' + blk + '\n' + h[i:]
    if h2 != h and write: wr('HANDOVER.md', h2)
    for f, rx, exp, what in checks(P):
        ms = re.findall(rx, rd(f), re.S)
        ms = [m if isinstance(m, tuple) else (m,) for m in ms]
        if not ms:
            errs.append(f'{f}: {what} not found (expected {exp})')
        for m in ms:
            if tuple(m) != exp:
                errs.append(f'{f}: {what} says {m}, PLANS/GBP say {exp}')
    if errs:
        raise SystemExit('Pricing check FAILED - these disagree with PLANS/GBP:\n  ' + '\n  '.join(errs))
    return P


if __name__ == '__main__':
    print(json.dumps(check_and_generate(), indent=1))
