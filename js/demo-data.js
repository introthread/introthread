// Introthread - Demo data (v109): seed, which fills the "Explore the live demo" account with sample people, Threads
// and Rooms. Moved out of js/app-core.js unchanged (cleanup plan step 9). Nothing uses it while the page loads: seed is
// called only when the demo starts (demoLogin in app-core.js) and from the signup sample button (suSample in
// auth-pages.js). Loads straight after app-core.js so seed is available as early as before. demo-mode.js (loaded last)
// is the separate file that keeps the demo account safe. demoStage, the old unused phone-mockup stage, was removed in v111.

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
