// Solmar Bay: Neon Shores — game state, the main loop, camera, combat,
// day/night and weather, menus, save/load and the screenshot staging hook.
'use strict';
(function bootGame() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  SB.Input.bind(canvas);

  const G = {
    mode: 'title',           // title | play | pause | dead | casino note
    time: 0, hour: 10.5, weather: 'sunny', weatherT: 60,
    camera: { x: 0, y: 0 }, shake: 0,
    player: SB.Player.freshState(),
    wanted: 0, seenByPolice: false, bustT: 0, spawnT: 0,
    missionIndex: 0, mission: null, missionRetry: false,
    activity: SB.Activities.freshActivity(),
    owned: [], casinoPlays: 0,
    toasts: [], dialogue: null, bullets: [], particles: [],
    district: '', kills: 0,
    addWanted(amount, why) {
      if (G.mode !== 'play') return;
      G.wanted = Math.min(5.6, G.wanted + amount);
    },
    toast(text) { G.toasts.push({ text, t: 4 }); if (G.toasts.length > 4) G.toasts.shift(); },
    saveGame() {
      try {
        localStorage.setItem('solmar-save', JSON.stringify({
          cash: G.player.cash, missionIndex: G.missionIndex, owned: G.owned,
          ammo: G.player.ammo, x: G.player.x, y: G.player.y,
        }));
        G.toast('Saved.');
      } catch (e) {}
    },
    loadGame() {
      try {
        const s = JSON.parse(localStorage.getItem('solmar-save') || 'null');
        if (!s) return false;
        G.player.cash = s.cash; G.missionIndex = s.missionIndex; G.owned = s.owned || [];
        G.player.ammo = s.ammo || G.player.ammo; G.player.x = s.x; G.player.y = s.y;
        return true;
      } catch (e) { return false; }
    },
  };
  window.SBGame = G;

  SB.Entities.spawnInitialTraffic(G);
  applyShotStaging(G);

  // ?shot=<name> stages a deterministic scene for screenshots and testing.
  function applyShotStaging(G) {
    const q = new URLSearchParams(location.search);
    const shot = q.get('shot');
    if (!shot) return;
    G.mode = 'play';
    const snapCam = () => { G.camera.x = Math.max(0, Math.min(SB.WORLD_W - 1280, G.player.x - 640)); G.camera.y = Math.max(0, Math.min(SB.WORLD_H - 800, G.player.y - 400)); };
    G.snapCam = snapCam;
    if (shot === 'cover') {
      G.player.x = 1960; G.player.y = 1618; G.hour = 10.5;
      SB.Missions.startMission(G);
    } else if (shot === 'drive') {
      const car = SB.Entities.cars[0];
      car.x = 1840; car.y = 1300; car.angle = Math.PI / 2; car.speed = 150;
      G.player.vehicle = car; car.driver = 'player'; G.player.x = car.x; G.player.y = car.y;
      G.hour = 15;
    } else if (shot === 'chase') {
      const car = SB.Entities.cars[1];
      car.x = 2380; car.y = 1500; car.angle = 0; car.speed = 190;
      G.player.vehicle = car; car.driver = 'player'; G.player.x = car.x; G.player.y = car.y;
      G.wanted = 3.4; G.hour = 17.8;
      SB.Missions.startMission(G);
    } else if (shot === 'mission') {
      G.player.x = 2150; G.player.y = 1500; G.hour = 12;
      G.missionIndex = 11; SB.Missions.startMission(G);
      G.player.cash = 1800;
    }
    snapCam();
    G.stageSnap = 9999; // keep the camera pinned to the staged scene while capturing
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (G.mode === 'play') update(dt);
    render();
    SB.Input.endFrame();
  }
  requestAnimationFrame(frame);

  function update(dt) {
    G.time += dt;
    G.hour = (G.hour + dt * 0.02) % 24;   // a full day lasts ~20 minutes
    G.weatherT -= dt;
    if (G.weatherT <= 0) { G.weatherT = 50 + Math.random() * 60; G.weather = ['sunny', 'sunny', 'sunny', 'cloudy', 'rain', 'fog'][Math.floor(Math.random() * 6)]; }
    const p = G.player;
    if (SB.Input.hit('KeyE')) {
      if (!SB.Activities.tryInteract(G)) {
        if (G.missionRetry || (!G.mission && SB.Missions.current(G))) {
          const m = SB.Missions.markerFor(G);
          if (Math.hypot(p.x - m.x, p.y - m.y) < 70) { SB.Missions.startMission(G); G.missionRetry = false; }
          else SB.Player.tryEnterExit(G);
        } else SB.Player.tryEnterExit(G);
      }
    }
    if (SB.Input.hit('KeyJ')) SB.Activities.startRandomJob(G);
    if (SB.Input.hit('KeyR') && !p.vehicle) SB.Activities.startRampage(G);
    for (let i = 1; i <= 3; i++) if (SB.Input.hit('Digit' + i) && !p.vehicle) { /* races handled near starts below */ }
    if (p.vehicle) SB.Player.updateDriving(G, dt); else SB.Player.updateOnFoot(G, dt);
    updateTraffic(G, dt);
    updatePeds(G, dt);
    SB.Police.update(G, dt);
    SB.Missions.update(G, dt);
    SB.Activities.update(G, dt);
    updateCombat(G, dt);
    // Bust check
    if (G.bustT > 2.2) { busted(G); }
    if (G.spawnT > 0) G.spawnT -= dt;
    if (p.health <= 0 && !p.dead) wasted(G);
    // Camera: follows the player, leads toward velocity when driving.
    const lead = p.vehicle ? 0.35 : 0.12;
    const tx = p.x + Math.cos(p.angle) * (p.vehicle ? Math.abs(p.vehicle.speed) * lead : 0) - SB.Render.W / 2;
    const ty = p.y + Math.sin(p.angle) * (p.vehicle ? Math.abs(p.vehicle.speed) * lead : 0) - SB.Render.H / 2;
    G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
    G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
    G.camera.x = Math.max(0, Math.min(SB.WORLD_W - SB.Render.W, G.camera.x));
    G.camera.y = Math.max(0, Math.min(SB.WORLD_H - SB.Render.H, G.camera.y));
    if (G.stageSnap > 0) { G.stageSnap--; G.snapCam && G.snapCam(); }
    if (G.shake > 0) { G.camera.x += (Math.random() - 0.5) * G.shake; G.camera.y += (Math.random() - 0.5) * G.shake; G.shake *= 0.85; }
    const d = SB.World.districtAt(p.x, p.y);
    const dName = d ? d.name : (p.y > SB.OCEAN_Y ? 'Solmar Bay (open water)' : 'Solmar Bay');
    if (dName !== G.district) { G.district = dName; if (G.time > 3) G.toast(dName); }
    for (const t of G.toasts) t.t -= dt;
    G.toasts = G.toasts.filter((t) => t.t > 0);
    if (G.dialogue) { G.dialogue.t -= dt; if (G.dialogue.t <= 0) G.dialogue = null; }
    SB.Audio.music(dt, G.wanted < 1);
    // Race starts: standing on a start pad in a car begins that race.
    if (p.vehicle && G.activity.kind === null) for (let i = 0; i < SB.Activities.RACE_STARTS.length; i++) {
      const r = SB.Activities.RACE_STARTS[i];
      if (Math.hypot(p.x - r.x, p.y - r.y) < 45 && SB.Input.hit('KeyE')) SB.Activities.startRace(G, i);
    }
  }

  function updateTraffic(G, dt) {
    for (const c of SB.Entities.cars) {
      if (c.driver !== 'traffic' || c.health <= 0) continue;
      const horiz = Math.abs(Math.cos(c.angle)) > 0.7;
      // Slow for the car ahead or a fleeing crowd
      let blocked = false;
      for (const o of SB.Entities.cars) {
        if (o === c) continue;
        const ahead = horiz ? (o.x - c.x) * Math.sign(Math.cos(c.angle)) : (o.y - c.y) * Math.sign(Math.sin(c.angle));
        const side = horiz ? Math.abs(o.y - c.y) : Math.abs(o.x - c.x);
        if (ahead > 0 && ahead < 58 && side < 20) blocked = true;
      }
      c.speed += ((blocked ? 0 : 95) - c.speed) * Math.min(1, dt * 1.6);
      if (blocked && Math.random() < dt * 0.3) SB.Audio.horn();
      let nx = c.x + Math.cos(c.angle) * c.speed * dt, ny = c.y + Math.sin(c.angle) * c.speed * dt;
      // Turn at intersections sometimes
      const nearX = SB.AVENUES.some((a) => Math.abs(nx - a) < 8), nearY = SB.BOULEVARDS.some((b) => Math.abs(ny - b) < 8);
      if ((nearX || nearY) && Math.random() < 0.012) c.angle += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      if (nx < 40 || nx > SB.WORLD_W - 40 || ny < 40 || ny > SB.OCEAN_Y - 30) { c.angle += Math.PI; nx = c.x; ny = c.y; }
      const fixed = SB.World.collideCircle(nx, ny, 18);
      c.x = fixed.x; c.y = Math.min(fixed.y, SB.OCEAN_Y - 6);
    }
    for (const b of SB.Entities.boats) {
      if (b.driver !== 'traffic') continue;
      b.x += Math.cos(b.angle) * 42 * dt; b.y += Math.sin(b.angle) * 10 * dt;
      if (b.x < 120 || b.x > SB.WORLD_W - 120) b.angle = Math.PI - b.angle;
      b.y = Math.max(SB.OCEAN_Y + 40, Math.min(SB.WORLD_H - 60, b.y));
    }
    // Player vehicle collisions with traffic: shunt, damage, wanted heat.
    const pv = G.player.vehicle;
    if (pv) for (const c of SB.Entities.cars) {
      if (c === pv || c.health <= 0) continue;
      if (Math.hypot(c.x - pv.x, c.y - pv.y) < 34) {
        const push = Math.atan2(c.y - pv.y, c.x - pv.x);
        c.x += Math.cos(push) * 14; c.y += Math.sin(push) * 14;
        if (Math.abs(pv.speed) > 110) {
          c.health -= 12; pv.health -= 5; G.shake = Math.max(G.shake, 4);
          SB.Audio.noise(0.18, 0.3, 500);
          G.addWanted(0.25, 'collision');
          if (G.activity.kind === 'rampage' && c.health <= 0) G.activity.score++;
          if (c.health <= 0 && c.driver !== 'wrecked') { c.driver = 'wrecked'; c.speed = 0; }
        }
        pv.speed *= 0.82;
      }
    }
  }
  function updatePeds(G, dt) {
    for (const pd of SB.Entities.peds) {
      if (pd.health <= 0) continue;
      pd.walkT -= dt;
      const danger = Math.hypot(pd.x - G.player.x, pd.y - G.player.y) < 90 && (G.wanted > 1.5 || G.player.weapon > 0 && SB.Input.mouse.down);
      if (danger) pd.panicT = 2;
      if (pd.walkT <= 0) { pd.walkT = 2 + Math.random() * 3; pd.angle = Math.random() * Math.PI * 2; }
      const sp = pd.panicT > 0 ? 120 : 42;
      if (pd.panicT > 0) { pd.panicT -= dt; pd.angle = Math.atan2(pd.y - G.player.y, pd.x - G.player.x); }
      let nx = pd.x + Math.cos(pd.angle) * sp * dt, ny = pd.y + Math.sin(pd.angle) * sp * dt;
      if (SB.World.buildingAt(nx, ny)) { pd.angle += Math.PI / 2; continue; }
      pd.x = Math.max(10, Math.min(SB.WORLD_W - 10, nx)); pd.y = Math.max(10, Math.min(SB.OCEAN_Y - 10, ny));
      // Run over check
      const v = G.player.vehicle;
      if (v && Math.abs(v.speed) > 60 && Math.hypot(pd.x - v.x, pd.y - v.y) < 22) {
        pd.health = 0; G.kills++; G.addWanted(1, 'hit and run'); G.toast('Hit and run! The police have been called.');
        SB.Audio.hurt();
      }
    }
  }
  function updateCombat(G, dt) {
    const p = G.player;
    p.fireT -= dt;
    for (let i = 1; i <= 9; i++) if (SB.Input.hit('Digit' + i)) p.weapon = i - 1;
    if (SB.Input.mouse.down && !p.vehicle && p.fireT <= 0) fireWeapon(G);
    for (let i = G.bullets.length - 1; i >= 0; i--) {
      const b = G.bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt; b.y += Math.sin(b.angle) * b.speed * dt; b.life -= dt;
      let hit = false;
      for (const pd of SB.Entities.peds) if (pd.health > 0 && Math.hypot(pd.x - b.x, pd.y - b.y) < 10) { damagePed(G, pd, b.dmg); hit = true; break; }
      if (!hit) for (const c of SB.Entities.cars) if (c.driver !== 'player' && Math.abs(c.x - b.x) < 26 && Math.abs(c.y - b.y) < 16) { damageCar(G, c, b.dmg); hit = true; break; }
      if (SB.World.buildingAt(b.x, b.y)) hit = true;
      if (hit || b.life <= 0) G.bullets.splice(i, 1);
    }
    for (let i = G.particles.length - 1; i >= 0; i--) { const pt = G.particles[i]; pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; if (pt.life <= 0) G.particles.splice(i, 1); }
    // Police gunfire at high heat when the player is on foot and visible
    if (G.wanted >= 3 && G.seenByPolice && !p.vehicle && Math.random() < dt * 1.4) {
      hurtPlayer(G, 4 + Math.random() * 5);
    }
    if (p.health < 100 && G.wanted === 0) p.health = Math.min(100, p.health + dt * 1.2);
  }
  function fireWeapon(G) {
    const p = G.player, w = SB.Player.WEAPONS[p.weapon];
    if (p.ammo[p.weapon] <= 0) { G.toast(w.name + ' is out of ammo — visit the gun shop.'); p.fireT = 0.3; return; }
    p.fireT = w.rate; p.ammo[p.weapon]--;
    SB.Audio.shot();
    G.addWanted(p.weapon === 0 ? 0.2 : 0.8, 'shots fired');
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const a = p.angle + (Math.random() - 0.5) * 2 * w.spread * 3;
      G.bullets.push({ x: p.x + Math.cos(p.angle) * 16, y: p.y + Math.sin(p.angle) * 16, angle: a, speed: 720, life: w.range / 720, dmg: w.dmg });
    }
    for (let i = 0; i < 3; i++) G.particles.push({ x: p.x + Math.cos(p.angle) * 20, y: p.y + Math.sin(p.angle) * 20, vx: Math.cos(p.angle) * 60, vy: Math.sin(p.angle) * 60, life: 0.12, color: '#ffd76a' });
    if (w.blast) for (const c of SB.Entities.cars) if (Math.hypot(c.x - p.aimX, c.y - p.aimY) < w.blast) damageCar(G, c, w.dmg);
  }
  function damagePed(G, pd, dmg) {
    pd.health -= dmg; pd.panicT = 3;
    for (let i = 0; i < 5; i++) G.particles.push({ x: pd.x, y: pd.y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, life: 0.4, color: '#c0392b' });
    if (pd.health <= 0) { G.kills++; G.addWanted(1.2, 'violence'); if (G.activity.kind === 'rampage') G.activity.score++; }
  }
  function damageCar(G, c, dmg) {
    c.health -= dmg;
    if (c.cop) G.addWanted(0.7, 'attacking police');
    if (c.health <= 0 && c.driver !== 'wrecked') {
      c.driver = 'wrecked'; c.speed = 0;
      for (let i = 0; i < 14; i++) G.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.6, color: '#ff7b33' });
      SB.Audio.noise(0.4, 0.4, 400);
      if (G.activity.kind === 'rampage') G.activity.score++;
    }
  }
  function hurtPlayer(G, dmg) {
    const p = G.player;
    if (p.armor > 0) { const absorbed = Math.min(p.armor, dmg * 0.6); p.armor -= absorbed; dmg -= absorbed; }
    p.health -= dmg; G.shake = Math.max(G.shake, 3); SB.Audio.hurt();
  }
  function busted(G) {
    G.bustT = 0; G.wanted = 0;
    const fine = Math.min(G.player.cash, 300);
    G.player.cash -= fine; G.player.health = 100;
    G.player.vehicle = null;
    G.player.x = 1840; G.player.y = 1230; // outside Downtown police HQ
    G.toast('BUSTED! Released after a $' + fine + ' fine.');
    G.mission = null; G.missionRetry = true;
  }
  function wasted(G) {
    const p = G.player; p.dead = true; G.mode = 'dead';
    setTimeout(() => {
      p.dead = false; p.health = 100; p.vehicle = null; G.wanted = 0;
      p.cash = Math.max(0, p.cash - 150);
      p.x = 2050; p.y = 1450; G.mode = 'play';
      G.toast('Solmar General discharged you. Hospital bill: $150.');
    }, 2600);
  }

  function render() {
    const R = SB.Render;
    if (G.mode === 'title') { R.drawWorld(ctx, G); drawTitle(ctx, G); return; }
    R.drawWorld(ctx, G);
    for (const b of SB.Entities.boats) R.drawVehicle(ctx, G, b);
    for (const pd of SB.Entities.peds) if (pd.health > 0) R.drawPed(ctx, G, pd);
    for (const c of SB.Entities.cars) R.drawVehicle(ctx, G, c);
    const heli = SB.Police.heli();
    if (heli) drawHeli(ctx, G, heli);
    R.drawPlayer(ctx, G);
    for (const b of G.bullets) { ctx.fillStyle = '#ffe66d'; ctx.fillRect(b.x - G.camera.x - 2, b.y - G.camera.y - 2, 4, 4); }
    for (const pt of G.particles) { ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life * 2); ctx.fillRect(pt.x - G.camera.x - 2, pt.y - G.camera.y - 2, 4, 4); ctx.globalAlpha = 1; }
    R.drawHUD(ctx, G);
    R.drawMinimap(ctx, G);
    if (G.dialogue) R.drawDialogue(ctx, G);
    if (G.mode === 'pause') R.drawPause(ctx, G);
    if (G.mode === 'dead') { ctx.fillStyle = 'rgba(120,0,0,0.45)'; ctx.fillRect(0, 0, R.W, R.H); ctx.fillStyle = '#fff'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WASTED', R.W / 2, R.H / 2); }
  }
  function drawHeli(ctx, G, heli) {
    const x = heli.x - G.camera.x, y = heli.y - G.camera.y;
    ctx.fillStyle = 'rgba(255,255,200,0.13)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 90, y + 330); ctx.lineTo(x + 90, y + 330); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(heli.angle);
    ctx.fillStyle = '#2d3436'; SB.Render.roundRect(ctx, -22, -9, 44, 18, 8); ctx.fill();
    ctx.fillRect(-38, -2, 18, 4);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    const sw = Math.sin(G.time * 40) * 26;
    ctx.beginPath(); ctx.moveTo(-sw, 0); ctx.lineTo(sw, 0); ctx.stroke();
    ctx.restore();
  }
  function drawTitle(ctx, G) {
    ctx.fillStyle = 'rgba(10,10,35,0.55)'; ctx.fillRect(0, 0, SB.Render.W, SB.Render.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 74px sans-serif';
    ctx.fillText('SOLMAR BAY', SB.Render.W / 2, 240);
    ctx.fillStyle = '#ff6b81'; ctx.font = 'bold 40px sans-serif';
    ctx.fillText('N E O N   S H O R E S', SB.Render.W / 2, 300);
    ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
    ctx.fillText('An open-world crime story in a sunny coastal city.', SB.Render.W / 2, 350);
    ctx.fillText('Play as Sol Vega: wheel-woman, errand runner, almost-legit citizen.', SB.Render.W / 2, 380);
    ctx.font = 'bold 24px sans-serif'; ctx.fillStyle = '#7bed9f';
    ctx.fillText(SB.Input.mouse.clicked || G.startHint ? '' : 'Click or press Enter to start', SB.Render.W / 2, 450);
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#dfe6e9';
    SB.KEYS_HELP.forEach((line, i) => ctx.fillText(line, SB.Render.W / 2, 500 + i * 24));
    if (SB.Input.mouse.clicked || SB.Input.hit('Enter')) { G.mode = 'play'; SB.Audio.ensure(); }
    // Keep the staged camera near downtown for the title backdrop
    G.camera.x = 1400; G.camera.y = 1100;
  }
  // Pause toggle
  addEventListener('keydown', (e) => {
    if ((e.code === 'KeyP' || e.code === 'Escape') && (G.mode === 'play' || G.mode === 'pause')) G.mode = G.mode === 'play' ? 'pause' : 'play';
    if (e.code === 'KeyF' && G.mode === 'pause') G.saveGame();
    if (e.code === 'KeyL' && G.mode === 'pause') { G.loadGame(); G.mode = 'play'; }
  });
})();
