#!/usr/bin/env python3
"""Monthly check of the outside libraries Introthread loads from jsDelivr.

Run from the repo root (needs internet):  python3 scripts/check_deps.py
- Lists every https://cdn.jsdelivr.net/npm/<pkg>@<version> URL in index.html and js/*.js.
- Shows the newest release in the same major version (usually a safe update) and the newest overall
  (a new major version can break things: read its changelog and test before moving).
- For scripts with an integrity="sha384-..." attribute, downloads the file and checks the hash still
  matches, and prints the new URL + hash to use when you update a pin.
Exit code 1 if an integrity hash no longer matches or a version is not pinned exactly; 0 otherwise.
Update a pin by changing the URL and its integrity hash together, then run the full test list (AGENTS.md).
"""
import base64, glob, hashlib, json, re, sys, urllib.request

ROOT_FILES = ['index.html'] + sorted(glob.glob('js/*.js'))
URL = re.compile(r'https://cdn\.jsdelivr\.net/npm/((?:@[\w.-]+/)?[\w.-]+)@([\w.^~-]+)(/[^"\'`\s)]*)?')

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'introthread-deps-check'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def resolve(pkg, rng):
    try: return json.loads(get(f'https://data.jsdelivr.com/v1/package/resolve/npm/{pkg}@{rng}')).get('version')
    except Exception: return None

def sri(data): return 'sha384-' + base64.b64encode(hashlib.sha384(data).digest()).decode()

def main():
    found, problems = {}, 0
    for f in ROOT_FILES:
        text = open(f, encoding='utf-8').read()
        for m in URL.finditer(text):
            tag = text[max(0, m.start() - 20): m.end() + 200]
            integ = re.search(r'integrity="(sha\d+-[^"]+)"', tag)
            found.setdefault((m.group(1), m.group(2), m.group(3) or ''), set()).add((f, integ.group(1) if integ else None))
    print(f'{len(found)} library URL(s) found\n')
    for (pkg, ver, path), where in sorted(found.items()):
        exact = re.fullmatch(r'\d+\.\d+\.\d+', ver) is not None
        major = ver.split('.')[0].lstrip('^~')
        same_major, latest = resolve(pkg, major), resolve(pkg, 'latest')
        files = ', '.join(sorted({w[0] for w in where}))
        print(f'{pkg}@{ver}{path}   ({files})')
        print(f'  newest {major}.x: {same_major}   newest overall: {latest}')
        if not exact:
            problems += 1
            print('  PROBLEM: not pinned to an exact version; pin it (e.g. @' + str(same_major) + ')')
        elif same_major and same_major != ver:
            print(f'  update available in the same major version: {ver} -> {same_major}')
        if latest and latest.split('.')[0] != major:
            print(f'  note: a new major version exists ({latest}); check its changelog before moving')
        for _, integ in where:
            if not integ: continue
            try:
                cur = sri(get(f'https://cdn.jsdelivr.net/npm/{pkg}@{ver}{path}'))
                if cur == integ: print('  integrity: ok')
                else: problems += 1; print(f'  PROBLEM: integrity hash no longer matches the CDN file ({cur})')
                if same_major and same_major != ver and exact:
                    print(f'  to update: https://cdn.jsdelivr.net/npm/{pkg}@{same_major}{path}  integrity="{sri(get(f"https://cdn.jsdelivr.net/npm/{pkg}@{same_major}{path}"))}"')
            except Exception as e:
                problems += 1; print(f'  PROBLEM: could not download to check integrity ({e})')
        print()
    print('Result:', 'problems found' if problems else 'all pinned, integrity ok')
    return 1 if problems else 0

if __name__ == '__main__':
    sys.exit(main())
