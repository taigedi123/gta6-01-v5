// Side activities and city services: taxi fares, street races, package
// deliveries, rampages, boat time trials, the casino, the metro, respray
// garages, gun shop and buyable properties that double as save points.
'use strict';
SB.Activities = (() => {
  const PROPERTIES = [
    { name: 'Fisherman Flats Safehouse', x: 700, y: 2000, price: 800 },
    { name: 'Neon Mile Loft', x: 2050, y: 1980, price: 2500 },
    { name: 'Verdant Hills Villa', x: 3300, y: 500, price: 6000 },
    { name: 'Casino Row Penthouse', x: 3300, y: 2450, price: 12000 },
  ];
  const RESPRAYS = [{ x: 1300, y: 700 }, { x: 2920, y: 1620 }, { x: 4000, y: 2080 }];
  const GUNSHOP = { x: 2380, y: 1160 };
  const CASINO = { x: 3050, y: 2500 };
  const RACE_STARTS = [
    { name: 'Beachfront Sprint', x: 300, y: 2540, checkpoints: [[900, 2540], [1500, 2540], [2100, 2540], [2700, 2540]], prize: 400 },
    { name: 'Downtown Circuit', x: 1840, y: 700, checkpoints: [[2380, 700], [2380, 1620], [1840, 1620], [1840, 700]], prize: 650 },
    { name: 'Harbour Run', x: 3460, y: 2080, checkpoints: [[4000, 2080], [4540, 2080], [4540, 2540], [4000, 2540]], prize: 550 },
  ];
  function freshActivity() { return { kind: null, step: 0, timer: 0, target: null, score: 0 }; }

  function tryInteract(G) {
    const p = G.player;
    // Casino tables: press E near the Gilded Palm to play a hand of Bay 21.
    if (Math.hypot(p.x - CASINO.x, p.y - CASINO.y) < 80) { playCasinoHand(G); return true; }
    for (const r of RESPRAYS) if (Math.hypot(p.x - r.x, p.y - r.y) < 70 && p.vehicle) {
      if (G.wanted > 0 && p.cash >= 200) { p.cash -= 200; G.wanted = 0; G.toast('Resprayed! Heat cleared for $200.'); }
      else if (p.vehicle.health < 100) { p.vehicle.health = 100; G.toast('Vehicle repaired at the respray garage.'); }
      else G.toast('Respray garage: $200 clears your wanted level.');
      return true;
    }
    if (Math.hypot(p.x - GUNSHOP.x, p.y - GUNSHOP.y) < 70) {
      let bought = false;
      for (let i = 1; i < SB.Player.WEAPONS.length; i++) if (p.ammo[i] < SB.Player.WEAPONS[i].ammo) { p.ammo[i] = SB.Player.WEAPONS[i].ammo; bought = true; }
      if (bought && p.cash >= 150) { p.cash -= 150; G.toast('Ammo restocked at the gun shop for $150.'); }
      else G.toast('Gun shop: ammo is already full (or bring $150).');
      return true;
    }
    for (const prop of PROPERTIES) if (Math.hypot(p.x - prop.x, p.y - prop.y) < 75) {
      if (G.owned.includes(prop.name)) { G.saveGame(); G.toast(prop.name + ': game saved, health restored.'); p.health = 100; }
      else if (p.cash >= prop.price) { p.cash -= prop.price; G.owned.push(prop.name); G.saveGame(); G.toast('Bought ' + prop.name + '! It is now a save point.'); SB.Audio.cash(); }
      else G.toast(prop.name + ' — for sale: $' + prop.price);
      return true;
    }
    // Metro: ride to the next station for $5.
    for (const s of SB.World.METRO_STATIONS) if (Math.hypot(p.x - s.x, p.y - s.y) < 60) {
      if (p.cash >= 5 && !p.vehicle) {
        const idx = SB.World.METRO_STATIONS.indexOf(s);
        const next = SB.World.METRO_STATIONS[(idx + 1) % SB.World.METRO_STATIONS.length];
        p.cash -= 5; p.x = next.x + 30; p.y = next.y + 30;
        G.toast('Metro: ' + s.name + ' → ' + next.name + ' ($5)');
      } else G.toast('Metro station: ' + s.name + ' — $5 a ride, on foot only.');
      return true;
    }
    return false;
  }
  function playCasinoHand(G) {
    const bet = 100, p = G.player;
    if (p.cash < bet) { G.toast('Gilded Palm: Bay 21 needs a $100 stake.'); return; }
    p.cash -= bet;
    const mine = 15 + Math.floor(Math.random() * 10), dealer = 14 + Math.floor(Math.random() * 10);
    if (mine <= 21 && (dealer > 21 || mine > dealer)) { const win = bet * 2; p.cash += win; G.toast('Bay 21: you ' + mine + ' vs dealer ' + dealer + ' — WIN $' + win + '!'); SB.Audio.cash(); }
    else G.toast('Bay 21: you ' + mine + ' vs dealer ' + dealer + ' — the house takes it.');
    G.casinoPlays++;
  }
  function update(G, dt) {
    const a = G.activity; if (!a || !a.kind) return;
    a.timer -= dt;
    if (a.kind === 'race' || a.kind === 'boatTrial' || a.kind === 'delivery' || a.kind === 'taxi') {
      const t = a.target;
      if (t && Math.hypot(G.player.x - t.x, G.player.y - t.y) < 80) {
        if (a.kind === 'race') {
          a.step++;
          const race = RACE_STARTS[a.raceIdx];
          if (a.step >= race.checkpoints.length) { G.player.cash += race.prize; G.toast(race.name + ' won! +$' + race.prize); SB.Audio.cash(); G.activity = freshActivity(); return; }
          a.target = { x: race.checkpoints[a.step][0], y: race.checkpoints[a.step][1] };
          G.toast('Checkpoint ' + (a.step + 1) + ' of ' + race.checkpoints.length);
        } else {
          const pay = a.kind === 'taxi' ? 120 + Math.floor(Math.random() * 120) : a.kind === 'delivery' ? 180 : 300;
          G.player.cash += pay; G.toast('Job done! +$' + pay); SB.Audio.cash(); G.activity = freshActivity(); return;
        }
      }
      if (a.timer <= 0) { G.toast('Job timed out.'); G.activity = freshActivity(); }
    }
    if (a.kind === 'rampage') {
      if (a.timer <= 0) {
        if (a.score >= 6) { G.player.cash += 500; G.toast('Rampage cleared! +$500'); SB.Audio.cash(); }
        else G.toast('Rampage over: ' + a.score + ' of 6 wrecks.');
        G.activity = freshActivity();
      }
    }
  }
  function startRandomJob(G) {
    const kinds = ['taxi', 'delivery', 'boatTrial'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const spots = [[900, 900], [2620, 1300], [3900, 2620], [700, 500], [3300, 500], [2050, 2100], [500, 2560]];
    const s = kind === 'boatTrial' ? { x: 2600, y: 3120 } : spots[Math.floor(Math.random() * spots.length)];
    G.activity = { kind, step: 0, timer: kind === 'taxi' ? 90 : 120, target: { x: s.x, y: s.y }, score: 0 };
    G.toast(kind === 'taxi' ? 'Taxi fare waiting — follow the blue marker!' : kind === 'delivery' ? 'Package run — follow the blue marker!' : 'Boat time trial — reach the buoy!');
  }
  function startRace(G, idx) {
    const race = RACE_STARTS[idx];
    G.activity = { kind: 'race', raceIdx: idx, step: 0, timer: 240, target: { x: race.checkpoints[0][0], y: race.checkpoints[0][1] }, score: 0 };
    G.toast(race.name + ' started! Prize $' + race.prize);
  }
  function startRampage(G) {
    G.activity = { kind: 'rampage', step: 0, timer: 60, target: null, score: 0 };
    G.addWanted(2, 'rampage'); G.toast('RAMPAGE! Wreck 6 vehicles in 60 seconds!');
  }
  return { PROPERTIES, RESPRAYS, GUNSHOP, CASINO, RACE_STARTS, freshActivity, tryInteract, update, startRandomJob, startRace, startRampage };
})();
