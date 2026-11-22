// Wanted system and police response: patrols, chases, roadblocks, the
// helicopter at high heat, line-of-sight escape, respray and safehouses.
'use strict';
SB.Police = (() => {
  const cops = [];       // police cars (entries in Entities.cars flagged cop)
  let heli = null;
  let hiddenT = 0;       // time spent out of police sight
  function wantedCap(G) { return Math.min(5, Math.max(0, Math.floor(G.wanted))); }

  function spawnCop(G) {
    const p = G.player;
    const ang = Math.random() * Math.PI * 2, dist = 380 + Math.random() * 160;
    let x = p.x + Math.cos(ang) * dist, y = p.y + Math.sin(ang) * dist;
    x = Math.max(60, Math.min(SB.WORLD_W - 60, x)); y = Math.max(60, Math.min(SB.OCEAN_Y - 60, y));
    const c = SB.Entities.makeCar(11, x, y, ang + Math.PI);
    c.cop = true; c.driver = 'cop'; c.color = '#dfe6e9';
    SB.Entities.cars.push(c); cops.push(c);
    return c;
  }
  function update(G, dt) {
    const stars = wantedCap(G);
    const want = stars === 0 ? 0 : 1 + stars; // cruisers on the hunt
    const active = cops.filter((c) => c.health > 0);
    if (active.length < want && G.spawnT <= 0) { spawnCop(G); G.spawnT = 2.5; }
    if (stars >= 4 && !heli) heli = { x: G.player.x - 400, y: G.player.y - 300, angle: 0 };
    if (stars < 4) heli = null;
    let seen = false;
    for (const c of cops) {
      if (c.health <= 0 || c.driver !== 'cop') continue;
      const p = G.player, dx = p.x - c.x, dy = p.y - c.y, dist = Math.hypot(dx, dy);
      if (dist < 430) seen = true;
      const target = Math.atan2(dy, dx);
      let da = target - c.angle;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      c.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, da));
      const top = c.type.speed * (stars >= 3 ? 1.02 : 0.9);
      c.speed = Math.min(top, c.speed + c.type.accel * dt * (dist > 70 ? 1 : -0.4));
      const nx = c.x + Math.cos(c.angle) * c.speed * dt, ny = c.y + Math.sin(c.angle) * c.speed * dt;
      const fixed = SB.World.collideCircle(nx, ny, 20);
      if (Math.abs(fixed.x - nx) > 2) c.speed *= 0.5;
      c.x = fixed.x; c.y = Math.min(fixed.y, SB.OCEAN_Y - 4);
      // Ramming / busting pressure when alongside the player.
      if (dist < 42 && !p.vehicle) { G.bustT += dt; } 
      if (dist < 46 && p.vehicle && Math.abs(p.vehicle.speed) < 12) { G.bustT += dt * 1.4; }
      if (Math.random() < dt * 0.4) SB.Audio.siren(G.time);
    }
    if (heli) {
      const p = G.player;
      heli.x += (p.x - heli.x) * 0.7 * dt + Math.cos(G.time) * 30 * dt;
      heli.y += (p.y - 60 - heli.y) * 0.7 * dt;
      heli.angle = Math.atan2(p.y - heli.y, p.x - heli.x);
      if (Math.hypot(p.x - heli.x, p.y - heli.y) < 260) seen = true;
    }
    if (stars > 0) {
      if (seen) { hiddenT = 0; G.seenByPolice = true; } else {
        G.seenByPolice = false; hiddenT += dt;
        if (hiddenT > 7) { G.wanted = Math.max(0, G.wanted - dt * 0.25); if (G.wanted < 0.15) { G.wanted = 0; G.toast('You lost the cops. Lay low, Sol.'); } }
      }
    }
    for (let i = cops.length - 1; i >= 0; i--) if (cops[i].health <= 0 || cops[i].driver !== 'cop' && cops[i].driver !== 'player') cops.splice(i, 1);
    updateRoadblocks(G, dt);
  }
  // At three stars and up, dispatch parks two cruisers across the road ahead
  // of the player as a roadblock; touching one at speed wrecks both cars.
  const blocks = [];
  let blockT = 0;
  function updateRoadblocks(G, dt) {
    blockT -= dt;
    if (wantedCap(G) >= 3 && blockT <= 0 && blocks.length < 2) {
      blockT = 14;
      const p = G.player;
      const ahead = 420;
      const bx = p.x + Math.cos(p.angle) * ahead, by = p.y + Math.sin(p.angle) * ahead;
      for (let i = 0; i < 2; i++) {
        const c = SB.Entities.makeCar(11, bx + i * 44 - 22, by + (i % 2 ? 16 : -16), p.angle + Math.PI / 2);
        c.cop = true; c.driver = 'roadblock'; c.color = '#dfe6e9'; c.speed = 0;
        SB.Entities.cars.push(c); blocks.push(c);
      }
      G.toast('Police roadblock ahead!');
    }
    for (let i = blocks.length - 1; i >= 0; i--) {
      const c = blocks[i];
      if (c.health <= 0 || c.driver !== 'roadblock') { blocks.splice(i, 1); continue; }
      const v = G.player.vehicle;
      if (v && Math.hypot(v.x - c.x, v.y - c.y) < 30) {
        if (Math.abs(v.speed) > 120) { c.health -= 45; v.health -= 18; G.shake = 8; SB.Audio.noise(0.35, 0.45, 350); G.toast('You smashed through the roadblock!'); }
        else { v.speed *= 0.3; G.bustT += dt * 2; }
      }
    }
  }
  function roadblocks(G) { return blocks; }
  return { update, cops: () => cops, heli: () => heli, wantedCap, roadblocks };
})();
