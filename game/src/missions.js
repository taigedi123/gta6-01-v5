// The story of Sol Vega: fifteen missions from beach errands to the
// Gilded Palm casino heist. Each mission is data plus small step handlers.
'use strict';
SB.Missions = (() => {
  // Steps: goto {x,y,label} | pickup | chase target car | deliver | survive seconds
  const STORY = [
    { title: 'First Shift', giver: 'Tía Rosa', pay: 150, steps: [{ t: 'goto', x: 900, y: 1300, label: 'Drive to Mercado Central market' }, { t: 'goto', x: 1990, y: 1560, label: 'Bring the groceries back home' }], intro: 'Rosa: Mija, the market run. Simple. Stay out of trouble.', done: 'Rosa: See? Honest work suits you.' },
    { title: 'Pier Pressure', giver: 'Capitan Bruno', pay: 220, steps: [{ t: 'goto', x: 1900, y: 2680, label: 'Meet Bruno at Marina Azul' }, { t: 'boat', x: 2600, y: 3120, label: 'Take a boat out to the buoy' }, { t: 'goto', x: 1900, y: 2680, label: 'Return to the marina' }], intro: 'Bruno: A package fell off a yacht. Fish it out, no questions.', done: 'Bruno: Dry enough. Good work.' },
    { title: 'Taxi for Mr. Chen', giver: 'Dispatch', pay: 260, steps: [{ t: 'goto', x: 2620, y: 1300, label: 'Pick up Mr. Chen in the suburbs' }, { t: 'goto', x: 3900, y: 2620, label: 'Drop him at Solmar Intl Airport' }], intro: 'Dispatch: Fare waiting in Palmetto. He tips for speed, not for dents.', done: 'Chen: Five stars. Do not tell my wife.' },
    { title: 'Neon Errand', giver: 'DJ Prisma', pay: 320, steps: [{ t: 'goto', x: 2050, y: 2100, label: 'Collect the records on the Neon Mile' }, { t: 'goto', x: 700, y: 500, label: 'Deliver them to the University Quarter party' }], intro: 'Prisma: My set is in an hour and my vinyl is across town.', done: 'Prisma: You just saved the whole night.' },
    { title: 'Dockside Debt', giver: 'Capitan Bruno', pay: 420, steps: [{ t: 'goto', x: 4100, y: 1900, label: 'Visit the Rusthook Docks warehouse' }, { t: 'survive', secs: 45, label: 'Hold the warehouse yard' }, { t: 'goto', x: 1900, y: 2680, label: 'Report back to Bruno' }], intro: 'Bruno: Some collectors need collecting. Bring a piece.', done: 'Bruno: The docks remember who pays.' },
    { title: 'Campus Courier', giver: 'Prof. Ito', pay: 380, steps: [{ t: 'goto', x: 800, y: 420, label: 'Pick up the sealed thesis' }, { t: 'goto', x: 1750, y: 1250, label: 'Deliver it downtown before it leaks' }], intro: 'Ito: Tenure rides on this envelope. So does my mortgage.', done: 'Ito: Sealed, delivered, tenured.' },
    { title: 'Beach Buggy Bash', giver: 'Lifeguard Lola', pay: 450, steps: [{ t: 'goto', x: 500, y: 2560, label: 'Reach the Coral Beachfront buggy' }, { t: 'goto', x: 1400, y: 2560, label: 'Race the beach to the pier flags' }], intro: 'Lola: Tourists keep stealing the rescue buggy. Race it back.', done: 'Lola: Fastest lifeguard in Solmar Bay.' },
    { title: 'The Accountant', giver: 'Mr. Chen', pay: 600, steps: [{ t: 'goto', x: 3050, y: 2500, label: 'Tail the accountant to Casino Row' }, { t: 'survive', secs: 40, label: 'Shake his bodyguards' }, { t: 'goto', x: 2620, y: 1300, label: 'Return to Mr. Chen' }], intro: 'Chen: My accountant gambles with my money. Persuade him home.', done: 'Chen: He resigned. Voluntarily.' },
    { title: 'Hill Country Run', giver: 'Tía Rosa', pay: 550, steps: [{ t: 'goto', x: 3300, y: 500, label: 'Climb to the Verdant Hills villa' }, { t: 'goto', x: 900, y: 1300, label: 'Get back to Old Town in one piece' }], intro: 'Rosa: A wedding cake. Hills road. Do not sit on it.', done: 'Rosa: Not a crumb out of place.' },
    { title: 'Airport Dash', giver: 'Dispatch', pay: 700, steps: [{ t: 'goto', x: 3900, y: 2620, label: 'Reach the airport cargo gate' }, { t: 'goto', x: 2050, y: 2100, label: 'Drop the cargo on the Neon Mile' }], intro: 'Dispatch: Charter freight, very unofficial, very urgent.', done: 'Dispatch: Customs never saw a thing.' },
    { title: 'Canal Rat', giver: 'DJ Prisma', pay: 800, steps: [{ t: 'goto', x: 2000, y: 300, label: 'Search the Canal District boathouse' }, { t: 'boat', x: 1200, y: 3150, label: 'Escape by water to the west buoy' }, { t: 'goto', x: 700, y: 2000, label: 'Hide out in Fisherman Flats' }], intro: 'Prisma: Someone lifted my masters. The canal crew knows who.', done: 'Prisma: The masters are back. So is my career.' },
    { title: 'High Roller', giver: 'Madame Vera', pay: 1000, steps: [{ t: 'goto', x: 3050, y: 2500, label: 'Enter the Gilded Palm casino' }, { t: 'casino', label: 'Win $500 at the Gilded Palm tables' }, { t: 'goto', x: 3050, y: 2500, label: 'Cash out with Madame Vera' }], intro: 'Vera: Play my chips, darling. Win, and we talk business.', done: 'Vera: A natural. Now, about the vault…' },
    { title: 'Marked Money', giver: 'Madame Vera', pay: 1200, steps: [{ t: 'goto', x: 4100, y: 1900, label: 'Collect the marked bills at the docks' }, { t: 'goto', x: 3050, y: 2500, label: 'Bring them to the Gilded Palm' }], intro: 'Vera: Move the laundry money. The police scanner is quiet tonight.', done: 'Vera: Washed, pressed, perfect.' },
    { title: 'Getaway Weather', giver: 'Capitan Bruno', pay: 1500, steps: [{ t: 'goto', x: 1900, y: 2680, label: 'Stage the boat at Marina Azul' }, { t: 'survive', secs: 60, label: 'Wait out the storm patrols' }, { t: 'goto', x: 3900, y: 2620, label: 'Signal the crew at the airport' }], intro: 'Bruno: Tomorrow night we move. Tonight we rehearse.', done: 'Bruno: Crew is ready. Sleep well, Sol.' },
    { title: 'The Gilded Palm Heist', giver: 'Madame Vera', pay: 5000, steps: [{ t: 'goto', x: 3050, y: 2500, label: 'Walk into the Gilded Palm' }, { t: 'survive', secs: 75, label: 'Crack the vault while the crew holds the floor' }, { t: 'goto', x: 1900, y: 2680, label: 'Escape to Bruno and the boats' }, { t: 'boat', x: 4300, y: 3180, label: 'Lose the harbour patrol at the east buoy' }], intro: 'Vera: One night, one vault, a new life. Go loud only if you must.', done: 'Vera: Solmar Bay is yours now, Sol. Spend it slowly.' },
  ];
  function current(G) { return STORY[G.missionIndex] || null; }
  function startMission(G) {
    const m = current(G); if (!m) return;
    G.mission = { def: m, step: 0, timer: 0, casinoStart: G.player.cash };
    G.dialogue = { who: m.giver, text: m.intro, t: 7 };
    G.toast('Mission: ' + m.title);
  }
  function failMission(G, why) {
    G.toast('Mission failed: ' + why + ' — return to the marker to retry.');
    G.mission = null; G.missionRetry = true;
  }
  function update(G, dt) {
    const ms = G.mission; if (!ms) return;
    const step = ms.def.steps[ms.step]; if (!step) return finish(G);
    if (step.t === 'survive') {
      ms.timer += dt;
      if (G.missionIndex >= 4 && Math.random() < dt * 0.25) G.addWanted(0.4, 'disturbance');
      if (ms.timer >= step.secs) advance(G);
      return;
    }
    if (step.t === 'casino') { if (G.player.cash - ms.casinoStart >= 500) advance(G); return; }
    const d = Math.hypot(G.player.x - step.x, G.player.y - step.y);
    const needBoat = step.t === 'boat';
    if (d < (needBoat ? 90 : 55) && (!needBoat || (G.player.vehicle && G.player.vehicle.kind === 'boat') || step.y > SB.OCEAN_Y)) {
      if (needBoat && step.y > SB.OCEAN_Y && !G.player.vehicle) return;
      advance(G);
    }
  }
  function advance(G) {
    const ms = G.mission; ms.step++; ms.timer = 0;
    if (ms.step >= ms.def.steps.length) finish(G);
    else G.toast('Objective: ' + ms.def.steps[ms.step].label);
  }
  function finish(G) {
    const m = G.mission.def;
    G.player.cash += m.pay; SB.Audio.cash();
    G.dialogue = { who: m.giver, text: m.done, t: 7 };
    G.toast('Mission complete: ' + m.title + '  +$' + m.pay);
    G.mission = null; G.missionIndex++;
    try { localStorage.setItem('solmar-progress', JSON.stringify({ missionIndex: G.missionIndex, cash: G.player.cash })); } catch (e) {}
  }
  function objectiveText(G) {
    if (G.mission) {
      const s = G.mission.def.steps[G.mission.step];
      return G.mission.def.title + ': ' + s.label + (s.t === 'survive' ? ' (' + Math.ceil(s.secs - G.mission.timer) + 's)' : '');
    }
    const m = current(G);
    return m ? 'Go to the gold marker to start: ' + m.title : 'Story complete — free roam Solmar Bay!';
  }
  function markerFor(G) {
    if (G.mission) { const s = G.mission.def.steps[G.mission.step]; return s.x ? { x: s.x, y: s.y } : { x: 3050, y: 2500 }; }
    const spots = [{ x: 2050, y: 1450 }];
    return spots[0];
  }
  return { STORY, current, startMission, update, objectiveText, markerFor, failMission };
})();
