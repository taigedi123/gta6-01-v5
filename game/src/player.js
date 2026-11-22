// The player: on-foot movement, driving, the weapon wheel and combat.
// One character, Marisol "Sol" Vega, a wheel-woman trying to go straight.
'use strict';
SB.Player = (() => {
  const WEAPONS = [
    { name: 'Fists',        dmg: 12, rate: 0.35, range: 30,  ammo: Infinity, spread: 0, auto: false },
    { name: 'Pistol',       dmg: 22, rate: 0.28, range: 460, ammo: 60,  spread: 0.03, auto: false },
    { name: 'Micro SMG',    dmg: 14, rate: 0.09, range: 420, ammo: 160, spread: 0.09, auto: true },
    { name: 'Shotgun',      dmg: 9,  rate: 0.8,  range: 240, ammo: 32,  spread: 0.16, auto: false, pellets: 6 },
    { name: 'Assault Rifle', dmg: 20, rate: 0.11, range: 560, ammo: 240, spread: 0.05, auto: true },
    { name: 'Sniper Rifle', dmg: 90, rate: 1.1,  range: 900, ammo: 20,  spread: 0.005, auto: false },
    { name: 'Grenades',     dmg: 70, rate: 0.7,  range: 300, ammo: 8,   spread: 0.2, auto: false, blast: 70 },
    { name: 'Molotov',      dmg: 45, rate: 0.6,  range: 280, ammo: 10,  spread: 0.15, auto: false, blast: 55 },
    { name: 'Minigun',      dmg: 11, rate: 0.05, range: 480, ammo: 400, spread: 0.12, auto: true },
  ];
  function freshState() {
    return {
      x: SB.START.x, y: SB.START.y, angle: 0, vx: 0, vy: 0,
      health: 100, armor: 0, cash: 240, weapon: 1, fireT: 0,
      ammo: WEAPONS.map((w) => w.ammo), vehicle: null, dead: false, swim: false,
    };
  }
  function updateOnFoot(G, dt) {
    const p = G.player, I = SB.Input;
    let mx = (I.down('KeyD', 'ArrowRight') ? 1 : 0) - (I.down('KeyA', 'ArrowLeft') ? 1 : 0);
    let my = (I.down('KeyS', 'ArrowDown') ? 1 : 0) - (I.down('KeyW', 'ArrowUp') ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    const sprint = I.down('ShiftLeft', 'ShiftRight') ? 1.55 : 1;
    const speed = 165 * sprint * (p.swim ? 0.55 : 1);
    p.x += (mx / len) * speed * dt; p.y += (my / len) * speed * dt;
    if (mx || my) p.angle = Math.atan2(my, mx);
    const fixed = SB.World.collideCircle(p.x, p.y, 13);
    if (!p.swim) { p.x = fixed.x; p.y = fixed.y; }
    p.x = Math.max(10, Math.min(SB.WORLD_W - 10, p.x));
    p.y = Math.max(10, Math.min(SB.WORLD_H - 10, p.y));
    p.swim = p.y > SB.OCEAN_Y + 26;
    // Aim at the mouse in world space.
    const wx = G.camera.x + I.mouse.x, wy = G.camera.y + I.mouse.y;
    if (!mx && !my) p.angle = Math.atan2(wy - p.y, wx - p.x);
    p.aimX = wx; p.aimY = wy;
  }
  function updateDriving(G, dt) {
    const p = G.player, v = p.vehicle, I = SB.Input, t = v.type;
    const fwd = I.down('KeyW', 'ArrowUp') ? 1 : 0, back = I.down('KeyS', 'ArrowDown') ? 1 : 0;
    const steer = (I.down('KeyD', 'ArrowRight') ? 1 : 0) - (I.down('KeyA', 'ArrowLeft') ? 1 : 0);
    if (fwd) v.speed += t.accel * dt;
    if (back) v.speed -= (v.speed > 5 ? 260 : 90) * dt;
    if (!fwd && !back) v.speed -= v.speed * 0.7 * dt;
    const handbrake = I.down('Space');
    if (handbrake) v.speed -= v.speed * 2.4 * dt;
    const maxF = t.speed * (I.down('ShiftLeft') ? 1.18 : 1), maxR = -t.speed * 0.35;
    v.speed = Math.max(maxR, Math.min(maxF, v.speed));
    if (Math.abs(v.speed) > 2) v.angle += steer * t.grip * dt * (v.speed > 0 ? 1 : -1) * Math.min(1, Math.abs(v.speed) / 90);
    const nx = v.x + Math.cos(v.angle) * v.speed * dt, ny = v.y + Math.sin(v.angle) * v.speed * dt;
    if (v.kind === 'boat') {
      if (ny > SB.OCEAN_Y - 6 || SB.World.buildingAt(nx, ny)) { v.x = nx; v.y = Math.max(SB.OCEAN_Y - 4, Math.min(SB.WORLD_H - 20, ny)); }
    } else {
      const fixed = SB.World.collideCircle(nx, ny, 20);
      if (Math.abs(fixed.x - nx) > 1 || Math.abs(fixed.y - ny) > 1) { if (Math.abs(v.speed) > 130) { v.health -= 9; G.shake = 5; SB.Audio.noise(0.2, 0.3, 300); } v.speed *= 0.45; }
      v.x = fixed.x; v.y = fixed.y;
      if (v.y > SB.OCEAN_Y + 10) { v.y = SB.OCEAN_Y + 10; v.speed *= 0.6; } // cars stop at the waterline
    }
    p.x = v.x; p.y = v.y; p.angle = v.angle;
    SB.Audio.engine(v.speed / t.speed, true);
  }
  function tryEnterExit(G) {
    const p = G.player;
    if (p.vehicle) {
      const v = p.vehicle; p.vehicle = null; v.driver = v.kind === 'boat' ? 'moored' : 'parked';
      p.x = v.x - Math.sin(v.angle) * 30; p.y = v.y + Math.cos(v.angle) * 30;
      SB.Audio.engine(0, false);
      return;
    }
    const v = SB.Entities.nearestVehicle(G, p.x, p.y, 58);
    if (v) {
      if (v.driver === 'traffic') { G.addWanted(1, 'carjacking'); G.toast('Vehicle taken! The owner called it in.'); }
      p.vehicle = v; v.driver = 'player'; v.speed = Math.min(v.speed, 40);
    }
  }
  return { WEAPONS, freshState, updateOnFoot, updateDriving, tryEnterExit };
})();
