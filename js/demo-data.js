// Introthread - Demo data (v109): seed, which fills the "Explore the live demo" account with sample people, Threads
// and Rooms, and demoStage, the old phone-mockup stage for the marketing pages. Moved out of js/app-core.js unchanged and
// in their original order (cleanup plan step 9). Nothing uses either while the page loads: seed is called only when the
// demo starts (demoLogin in app-core.js) and by the signup preview in auth-pages.js, and demoStage is not called
// anywhere. Loads straight after app-core.js so seed is available as early as before. demo-mode.js (loaded last) is the
// separate file that keeps the demo account safe.

function seed(u) {
  const now = Date.now();
  const people = [
    [
      'Sarah Williams',
      'Marketing Director',
      'Acme Technologies',
      'London Tech Week',
      'Interested in an enterprise partnership. Wants a pilot proposal.',
      2 * DAY,
      true,
      'meet',
      'meet',
      false
    ],
    [
      'James Carter',
      'CEO',
      'Northwind Capital',
      'SaaStr Europa',
      'Raising a fund focused on HR tech. Asked about our data story.',
      4 * DAY,
      true,
      'intro',
      null,
      false
    ],
    [
      'Priya Shah',
      'Head of Platform',
      'Lattice Ventures',
      'Founders Breakfast, Shoreditch',
      'Runs portfolio talent programme. Possible design partner.',
      6 * DAY + 10 * HR,
      true,
      null,
      null,
      false
    ],
    [
      'Daniel Okafor',
      'Partner',
      'Atlas Seed',
      'Web Summit',
      'Great chat on Africa to UK expansion.',
      11 * DAY,
      true,
      'keep',
      'keep',
      true
    ],
    [
      'Emma Laurent',
      'Product Lead',
      'Helio',
      'London Tech Week',
      'Not a fit right now.',
      9 * DAY,
      true,
      'notnow',
      'keep',
      false
    ],
    ['Michael Brown', 'VP Sales', 'Brightline', 'Coffee, Kings Cross', '', 5 * HR, false, null, null, false]
  ];
  const room = {
    id: uid(),
    ownerId: u.id,
    name: 'London Tech Week Founders Night',
    date: now - 2 * DAY,
    location: 'Shoreditch, London',
    code: 'LTW26',
    created: now - 3 * DAY
  };
  DB.rooms.push(room);
  people.forEach(([name, role, company, where, note, age, conf, mine, theirs, res], i) => {
    const c = now - age;
    const t = {
      id: uid(),
      ownerId: u.id,
      other: { name, role, company, email: slug(name) + '@example.com' },
      where,
      note,
      createdAt: c,
      confirmed: conf,
      mine,
      theirs,
      resolvedAt: res ? c + 3 * DAY : null,
      roomId: where === 'London Tech Week' ? room.id : null,
      events: [{ k: 'tap', at: c, text: 'Tapped at ' + where }]
    };
    if (conf)
      t.events.push({ k: 'confirm', at: c + 20 * 6e4, text: name.split(' ')[0] + ' confirmed the Thread' });
    if (mine) t.events.push({ k: 'answer', at: c + HR, text: 'You answered "What\'s next?"' });
    if (theirs)
      t.events.push({ k: 'answer', at: c + 3 * HR, text: name.split(' ')[0] + ' answered "What\'s next?"' });
    if (res) {
      t.events.push({ k: 'followup', at: c + DAY, text: 'Follow-up sent' });
      t.events.push({ k: 'resolved', at: c + 3 * DAY, text: 'Thread resolved: stayed in touch' });
    }
    DB.threads.push(t);
  });
  for (let i = 0; i < 14; i++) {
    const n = [
      'Ava Thompson',
      'Leo Martins',
      'Grace Kim',
      'Noah Patel',
      'Zara Ahmed',
      'Oliver Grant',
      'Mia Rossi',
      'Ethan Cole',
      'Isla Murray',
      'Lucas Bauer',
      'Chloe Evans',
      'Ben Adeyemi',
      'Sofia Ruiz',
      'Jack Turner'
    ][i];
    const c = room.date + i * 9 * 6e4;
    const mine = ['meet', 'intro', 'keep', 'keep', 'meet', null, 'notnow'][i % 7];
    const theirs = i % 3 ? mine : 'keep';
    DB.threads.push({
      id: uid(),
      ownerId: u.id,
      other: {
        name: n,
        role: ['Founder', 'Investor', 'Engineer', 'Designer', 'Operator'][i % 5],
        company: ['Kite', 'Orbit', 'Fable', 'Verve', 'Atlas'][i % 5],
        email: slug(n) + '@example.com'
      },
      where: room.name,
      note: '',
      createdAt: c,
      confirmed: i % 5 !== 4,
      mine,
      theirs: i % 5 !== 4 ? theirs : null,
      resolvedAt: i % 4 === 0 ? c + DAY : null,
      roomId: room.id,
      events: [{ k: 'tap', at: c, text: 'Tapped in room ' + room.code }]
    });
  }
}

function demoStage() {
  return `<div class="stage">
<div class="phone a"><div class="notch"></div><div class="scr"><div class="top"><div class="tiny muted" style="font-weight:800;letter-spacing:.1em">YOUR CARD</div></div>
<div class="mini-card"><div class="row">${av('Sarah Williams', 'sm')}<div><b style="font-size:13px">Sarah Williams</b><div class="tiny" style="color:#aab3c4">Marketing Director, Acme</div></div></div><div class="tiny" style="margin-top:34px;color:#aab3c4">introthread.com/sarah</div></div>
<div style="padding:14px"><div class="tiny muted" style="font-weight:800;margin-bottom:8px">LAST THREAD</div><div class="row" style="border:1px solid var(--line);border-radius:12px;padding:10px">${av('James Carter', 'sm')}<div style="flex:1"><b style="font-size:12px">James Carter</b><div class="tiny muted">London Tech Week &middot; just now</div></div><span class="chip green" style="font-size:10px">Confirmed</span></div></div></div></div>
<div class="tapwave"></div><div class="tapwave d2"></div><div class="tapwave d3"></div><div class="threadline"></div>
<div class="phone b"><div class="notch"></div><div class="scr"><div class="top"><div class="tiny muted" style="font-weight:800;letter-spacing:.1em">NEW THREAD</div><b style="font-size:17px;display:block;margin-top:6px;letter-spacing:-.4px">You and Sarah met at London Tech Week</b></div>
<div style="padding:0 18px 6px" class="tiny muted">One question. Only you see your answer until you both reply.</div>
<div style="padding:4px 18px 0;font-weight:900;font-size:15px">What's next?</div>
<div class="q-opt on">Meet again ${ic('check', 14, '#3157ff', 3)}</div><div class="q-opt">Introduce someone</div><div class="q-opt">Stay in touch</div><div class="q-opt">Not now</div>
<div style="margin:12px 14px" class="tiny muted">${ic('lock', 12)} Private until you both answer</div></div></div></div>`;
}
