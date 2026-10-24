// Introthread - Supabase data layer (v104): the site config (CFG), the Supabase client (SB), the demo/cloud MODE,
// the row mappers (mapProfile, mapThread, mapRoom), loadCloud, addEvent and upd. Moved out of js/app-core.js unchanged
// and in their original order (cleanup plan step 8a). Loads straight after app-core.js, before every file that uses
// SB, MODE or CFG while loading (google-calendar.js, app-routing.js, payments.js, the admin files and others). Inside
// app-core.js these are used only inside functions and in boot, which waits until every deferred file has run.
// Tests swap in a fake Supabase by matching the formatted const SB = line in this file.

const CFG = window.INTROTHREAD_CONFIG || {};

const SB =
  window.supabase && CFG.supabaseUrl && CFG.supabaseAnonKey
    ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

let MODE = DB.session ? 'demo' : null;

const mapProfile = (p, email) => ({
  _c: true,
  id: p.id,
  name: p.name,
  email: email || '',
  role: p.role || '',
  company: p.company || '',
  city: p.city || '',
  bio: p.bio || '',
  handle: p.handle,
  theme: p.theme || 'midnight',
  photo: (p.links || {}).photo || null,
  links: p.links || {},
  plan: p.plan || 'Free',
  prefs: p.prefs || {},
  created: Date.parse(p.created_at) || Date.now()
});

const mapThread = r => ({
  _c: true,
  id: r.id,
  token: r.guest_token,
  ownerId: r.owner_id,
  other: {
    name: r.other_name,
    role: r.other_role || '',
    company: r.other_company || '',
    email: r.other_email || ''
  },
  where: r.where_met || 'In person',
  note: r.note || '',
  createdAt: Date.parse(r.created_at),
  confirmed: !!r.confirmed,
  mine: r.mine,
  theirs: r.theirs,
  resolvedAt: r.resolved_at ? Date.parse(r.resolved_at) : null,
  roomId: r.room_id,
  events: (r.thread_events || [])
    .map(e => ({ k: e.kind, at: Date.parse(e.at), text: e.text }))
    .sort((a, b) => a.at - b.at)
});

const mapRoom = r => ({
  _c: true,
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  date: Date.parse(r.event_date),
  location: r.location || '',
  code: r.code,
  created: Date.parse(r.created_at)
});

async function loadCloud(user) {
  let { data: p, error } = await SB.rpc('my_profile');
  if (error || (p && !p.id)) {
    if (error && !/function|schema cache/i.test(error.message || '')) console.warn(error);
    ({ data: p, error } = await SB.from('profiles').select('*').eq('id', user.id).maybeSingle());
    if (error) return fail(error);
  }
  if (!p) {
    const m = (user.user_metadata || {}).profile;
    if (!m) {
      MODE = 'cloud';
      DB.session = user.id;
      PENDING = user;
      return 'needs-profile';
    }
    const ins = await SB.from('profiles')
      .insert({
        id: user.id,
        handle: m.handle,
        name: m.name,
        role: m.role,
        company: m.company,
        city: m.city,
        bio: m.bio,
        theme: m.theme
      })
      .select('id,handle,name,role,company,city,bio,theme,links,created_at')
      .single();
    if (ins.error) return fail(ins.error);
    p = ins.data;
  }
  const [th, rm] = await Promise.all([
    SB.from('threads').select('*, thread_events(*)').order('created_at', { ascending: false }),
    SB.from('rooms').select('*')
  ]);
  if (th.error) return fail(th.error);
  if (rm.error) return fail(rm.error);
  clearCloud();
  DB.users.push(mapProfile(p, user.email));
  DB.threads.push(...th.data.map(mapThread));
  DB.rooms.push(...rm.data.map(mapRoom));
  DB.session = user.id;
  MODE = 'cloud';
  return 'ok';
}

async function addEvent(t, k, text) {
  const at = Date.now();
  t.events.push({ k, at, text });
  if (cloud()) {
    const { error } = await SB.from('thread_events').insert({ thread_id: t.id, kind: k, text });
    if (error) fail(error);
  }
}

async function upd(table, id, patch) {
  if (!cloud()) return true;
  const { error } = await SB.from(table).update(patch).eq('id', id);
  if (error) {
    fail(error);
    return false;
  }
  return true;
}
