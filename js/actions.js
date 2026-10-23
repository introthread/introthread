/*
 * actions.js - runs markup event handlers without inline JavaScript (v59).
 *
 * Instead of  onclick="admGo('users')"  markup uses  data-on-click="admGo('users')".
 * This file reads that text with a tiny parser (no eval / new Function), so the
 * Content-Security-Policy can drop 'unsafe-inline' once every handler is converted.
 *
 * Supported in a handler:
 *   - calls to global functions or methods:   fn(a, b)   history.back()   this.blur()
 *   - several calls separated by ';'
 *   - arguments: 'single' or "double" quoted strings, numbers, true/false/null,
 *     JSON-style [arrays] and {objects}, !value, this, event and their properties
 *     (this.value, this.checked, event.target.dataset.id)
 *   - return false   (prevents the default action)   and   return fn(...)
 * Anything else (if, assignments, arrow functions) must become a named function.
 * ACT.check(root) lists handlers that would fail, for tests.
 */
(function () {
  const cache = new Map();

  function parse(s) {
    let i = 0;
    const ws = () => {
      while (i < s.length && /\s/.test(s[i])) i++;
    };
    const fail = m => {
      throw new SyntaxError('data-on: ' + m + ' at ' + i + ' in: ' + s);
    };
    const ident = () => {
      ws();
      const m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i));
      if (!m) fail('name expected');
      i += m[0].length;
      return m[0];
    };
    const path = () => {
      const p = [ident()];
      while (s[i] === '.') {
        i++;
        p.push(ident());
      }
      return p;
    };
    const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', 0: '\0' };
    function str(q) {
      i++;
      let out = '';
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') {
          const c = s[++i];
          if (c === 'u') {
            out += String.fromCharCode(parseInt(s.substr(i + 1, 4), 16));
            i += 5;
          } else {
            out += c in ESC ? ESC[c] : c;
            i++;
          }
        } else out += s[i++];
      }
      if (s[i] !== q) fail('unclosed string');
      i++;
      return { t: 'lit', v: out };
    }
    function list(close, item) {
      const out = [];
      ws();
      if (s[i] === close) {
        i++;
        return out;
      }
      for (;;) {
        out.push(item());
        ws();
        if (s[i] === ',') {
          i++;
          continue;
        }
        if (s[i] === close) {
          i++;
          return out;
        }
        fail(close + ' expected');
      }
    }
    function value() {
      ws();
      const c = s[i];
      if (c === "'" || c === '"') return str(c);
      if (c === '[') {
        i++;
        return { t: 'arr', items: list(']', value) };
      }
      if (c === '{') {
        i++;
        return {
          t: 'obj',
          props: list('}', () => {
            ws();
            const k = s[i] === '"' || s[i] === "'" ? str(s[i]).v : ident();
            ws();
            if (s[i] !== ':') fail(': expected');
            i++;
            return [k, value()];
          })
        };
      }
      if (c === '!') {
        i++;
        return { t: 'not', a: value() };
      }
      const num = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
      if (num) {
        i += num[0].length;
        return { t: 'lit', v: +num[0] };
      }
      const p = path();
      const K = { true: true, false: false, null: null, undefined: undefined };
      if (p.length === 1 && p[0] in K) return { t: 'lit', v: K[p[0]] };
      if (p[0] === 'this' || p[0] === 'event') {
        ws();
        if (s[i] === '(') fail('calls are not allowed inside arguments');
        return { t: 'ref', p };
      }
      fail('unsupported value ' + p.join('.'));
    }
    function call() {
      const p = path();
      ws();
      if (s[i] !== '(') fail('( expected');
      i++;
      return { p, args: list(')', value) };
    }
    const out = [];
    for (;;) {
      ws();
      if (i >= s.length) break;
      if (s[i] === ';') {
        i++;
        continue;
      }
      if (/^return(?![\w$])/.test(s.slice(i))) {
        i += 6;
        ws();
        if (/^false(?![\w$])/.test(s.slice(i))) {
          i += 5;
          out.push({ t: 'retfalse' });
        } else out.push({ t: 'ret', c: call() });
        continue;
      }
      out.push({ t: 'do', c: call() });
    }
    return out;
  }

  const get = (o, keys) => keys.reduce((a, k) => (a == null ? undefined : a[k]), o);
  function val(n, el, ev) {
    switch (n.t) {
      case 'lit':
        return n.v;
      case 'not':
        return !val(n.a, el, ev);
      case 'arr':
        return n.items.map(x => val(x, el, ev));
      case 'obj':
        return Object.fromEntries(n.props.map(([k, v]) => [k, val(v, el, ev)]));
      case 'ref':
        return get(n.p[0] === 'this' ? el : ev, n.p.slice(1));
    }
  }
  function target(p, el, ev) {
    const local = p[0] === 'this' || p[0] === 'event';
    const root = p[0] === 'this' ? el : p[0] === 'event' ? ev : window;
    const keys = local ? p.slice(1) : p;
    const obj = get(root, keys.slice(0, -1));
    return [obj === window ? undefined : obj, obj == null ? undefined : obj[keys[keys.length - 1]]];
  }
  function compile(src) {
    let st = cache.get(src);
    if (!st) cache.set(src, (st = parse(src)));
    return st;
  }
  function run(src, el, ev) {
    let ret;
    for (const s of compile(src)) {
      if (s.t === 'retfalse') {
        ret = false;
        break;
      }
      const [obj, fn] = target(s.c.p, el, ev);
      if (typeof fn !== 'function') throw new TypeError('data-on: ' + s.c.p.join('.') + ' is not a function');
      const r = fn.apply(
        obj,
        s.c.args.map(a => val(a, el, ev))
      );
      if (s.t === 'ret') {
        ret = r;
        break;
      }
    }
    if (ret === false) ev.preventDefault();
  }

  /* Bubbling events: run every handler on the event's path, innermost first,
     stopping if one calls event.stopPropagation() - like inline handlers did. */
  function bubbling(ev) {
    const attr = 'data-on-' + ev.type;
    for (const el of ev.composedPath()) {
      if (!(el instanceof Element)) continue;
      const src = el.getAttribute(attr);
      if (src != null) run(src, el, ev);
      if (ev.cancelBubble) break;
    }
  }
  /* Events that do not bubble: only the element itself. */
  function direct(ev) {
    const el = ev.target;
    const src = el instanceof Element && el.getAttribute('data-on-' + ev.type);
    if (src) run(src, el, ev);
  }
  const BUBBLE = ['click', 'dblclick', 'change', 'input', 'submit', 'keydown', 'keyup', 'paste', 'mousemove'];
  const DIRECT = ['focus', 'blur', 'mouseenter', 'mouseleave'];
  BUBBLE.forEach(t => document.addEventListener(t, bubbling));
  DIRECT.forEach(t => document.addEventListener(t, direct, true));

  /* For tests: report data-on-* handlers under root that cannot run. */
  function check(root) {
    const bad = [];
    (root || document).querySelectorAll('*').forEach(el => {
      for (const a of el.attributes) {
        if (!a.name.startsWith('data-on-')) continue;
        const type = a.name.slice(8);
        if (!BUBBLE.includes(type) && !DIRECT.includes(type)) bad.push(a.name + ': event not handled');
        try {
          for (const s of compile(a.value)) {
            if (s.t === 'retfalse' || s.c.p[0] === 'this' || s.c.p[0] === 'event') continue;
            if (typeof target(s.c.p, el, {})[1] !== 'function')
              bad.push(a.value + ': ' + s.c.p.join('.') + ' missing');
          }
        } catch (e) {
          bad.push(e.message);
        }
      }
    });
    return bad;
  }
  window.ACT = { check, parse, run };
})();
