// Rendering: the sun-soaked city from above, vehicles, people, effects,
// the HUD, the canvas minimap, menus and dialogue. Pure Canvas 2D.
'use strict';
SB.Render = (() => {
  const W = 1280, H = 800;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function skyTint(G) {
    // Day/night: hour 0-24 -> darkness 0..0.75 and a warm tint near dawn/dusk.
    const h = G.hour;
    const dark = h < 5.5 || h > 19.5 ? 0.72 : h < 7 ? 0.35 : h > 17.5 ? 0.3 : 0;
    return dark;
  }
  function drawWorld(ctx, G) {
    const cam = G.camera, dark = skyTint(G);
    ctx.fillStyle = '#3f7fbf'; // the bay fills anything off-land
    ctx.fillRect(0, 0, W, H);
    // Landmass per district
    for (const d of SB.DISTRICTS) {
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
    }
    // Sand strip and water south of the ocean line
    ctx.fillStyle = '#ecd9a0'; ctx.fillRect(0, SB.OCEAN_Y - 26 - cam.y, W, 26 - (0));
    ctx.fillStyle = '#2e6da8'; ctx.fillRect(-cam.x, SB.OCEAN_Y - cam.y, SB.WORLD_W, SB.WORLD_H - SB.OCEAN_Y + cam.y * 0);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 26; i++) {
      const wx = ((i * 347 + G.time * 22) % (W + 120)) - 60, wy = SB.OCEAN_Y + 30 + (i * 53) % 380 - cam.y;
      if (wy > -10 && wy < H + 10) ctx.fillRect(wx, wy, 46, 3);
    }
    drawRoads(ctx, G, cam);
    // Metro line
    ctx.strokeStyle = '#57606f'; ctx.lineWidth = 5; ctx.beginPath();
    SB.World.METRO_STATIONS.forEach((s, i) => { const x = s.x - cam.x, y = s.y - cam.y; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    for (const s of SB.World.METRO_STATIONS) {
      ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(s.x - cam.x, s.y - cam.y, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('M', s.x - cam.x, s.y - cam.y + 3);
    }
    // Docks
    ctx.fillStyle = '#8a6d4f';
    for (const d of SB.World.docks) ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
    // Props and palms
    for (const pr of SB.World.props) {
      if (!onScreen(G, pr.x, pr.y, 40)) continue;
      ctx.fillStyle = pr.kind === 'crate' ? '#a8845c' : pr.kind === 'stall' ? '#e17055' : pr.kind === 'barrel' ? '#636e72' : '#7f8c8d';
      ctx.fillRect(pr.x - 8 - cam.x, pr.y - 8 - cam.y, 16, 16);
    }
    for (const b of SB.World.buildings) {
      if (!onScreen(G, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x - cam.x + 6, b.y - cam.y + 8, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, 5);
      // Window grid hints at height
      ctx.fillStyle = dark > 0.4 ? 'rgba(255,214,120,0.8)' : 'rgba(20,40,60,0.22)';
      const step = b.tall ? 24 : 34;
      for (let wx = b.x + 8; wx < b.x + b.w - 6; wx += step) for (let wy = b.y + 10; wy < b.y + b.h - 6; wy += step) ctx.fillRect(wx - cam.x, wy - cam.y, 6, 8);
    }
    for (const pm of SB.World.palms) {
      if (!onScreen(G, pm.x, pm.y, 40)) continue;
      ctx.strokeStyle = '#7a5c33'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(pm.x - cam.x, pm.y - cam.y); ctx.lineTo(pm.x - cam.x + 3, pm.y - cam.y - 10); ctx.stroke();
      ctx.strokeStyle = '#2e9e5b'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; ctx.beginPath(); ctx.moveTo(pm.x - cam.x + 3, pm.y - cam.y - 10); ctx.lineTo(pm.x - cam.x + 3 + Math.cos(a) * 13, pm.y - cam.y - 10 + Math.sin(a) * 7); ctx.stroke(); }
    }
    drawMarkers(ctx, G, cam);
    if (dark > 0) { ctx.fillStyle = 'rgba(8,12,40,' + dark * 0.55 + ')'; ctx.fillRect(0, 0, W, H); }
    if (G.weather === 'rain') {
      ctx.strokeStyle = 'rgba(180,210,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 90; i++) { const x = (i * 89 + G.time * 700) % W, y = (i * 61 + G.time * 900) % H; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13); }
      ctx.stroke();
    }
    if (G.weather === 'fog') { ctx.fillStyle = 'rgba(220,228,235,0.35)'; ctx.fillRect(0, 0, W, H); }
  }
  function onScreen(G, x, y, pad) { return x > G.camera.x - pad && x < G.camera.x + W + pad && y > G.camera.y - pad && y < G.camera.y + H + pad; }
  function drawRoads(ctx, G, cam) {
    ctx.fillStyle = '#4a4f57';
    for (const a of SB.AVENUES) ctx.fillRect(a - SB.TILE_ROAD / 2 - cam.x, -cam.y, SB.TILE_ROAD, SB.OCEAN_Y);
    for (const b of SB.BOULEVARDS) ctx.fillRect(-cam.x, b - SB.TILE_ROAD / 2 - cam.y, SB.WORLD_W, SB.TILE_ROAD);
    ctx.strokeStyle = 'rgba(255,220,120,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([18, 16]);
    ctx.beginPath();
    for (const a of SB.AVENUES) { ctx.moveTo(a - cam.x, -cam.y); ctx.lineTo(a - cam.x, SB.OCEAN_Y - cam.y); }
    for (const b of SB.BOULEVARDS) { ctx.moveTo(-cam.x, b - cam.y); ctx.lineTo(SB.WORLD_W - cam.x, b - cam.y); }
    ctx.stroke(); ctx.setLineDash([]);
    // Beach road name labels for flavour
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
  }
  function drawMarkers(ctx, G, cam) {
    const m = SB.Missions.markerFor(G);
    if (m) beacon(ctx, G, m.x - cam.x, m.y - cam.y, '#f5c542', '★');
    if (G.activity && G.activity.target) beacon(ctx, G, G.activity.target.x - cam.x, G.activity.target.y - cam.y, '#38b6ff', '◆');
    for (const prop of SB.Activities.PROPERTIES) {
      ctx.fillStyle = G.owned.includes(prop.name) ? '#2ecc71' : '#ffffff';
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⌂', prop.x - cam.x, prop.y - cam.y - 8);
    }
    ctx.fillStyle = '#e84393'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('$ CASINO', SB.Activities.CASINO.x - cam.x, SB.Activities.CASINO.y - cam.y - 14);
    ctx.fillStyle = '#dfe6e9'; ctx.fillText('RESPRAY', SB.Activities.RESPRAYS[0].x - cam.x, SB.Activities.RESPRAYS[0].y - cam.y - 12);
  }
  function beacon(ctx, G, x, y, color, glyph) {
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
    const bob = Math.sin(G.time * 4) * 5;
    ctx.fillStyle = color; ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.arc(x, y, 30 + bob, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = color;
    ctx.fillText(glyph, x, y - 34 + bob);
  }
  function drawVehicle(ctx, G, v) {
    const cam = G.camera, x = v.x - cam.x, y = v.y - cam.y;
    if (x < -80 || x > W + 80 || y < -80 || y > H + 80) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(v.angle);
    if (v.kind === 'boat') {
      ctx.fillStyle = v.color; ctx.beginPath();
      ctx.moveTo(30, 0); ctx.lineTo(12, -11); ctx.lineTo(-24, -9); ctx.lineTo(-28, 0); ctx.lineTo(-24, 9); ctx.lineTo(12, 11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-8, -6, 16, 12);
    } else {
      const t = v.type;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-t.w / 2 + 3, -t.h / 2 + 4, t.w, t.h);
      ctx.fillStyle = v.health < 40 ? '#555' : v.color;
      roundRect(ctx, -t.w / 2, -t.h / 2, t.w, t.h, 6); ctx.fill();
      ctx.fillStyle = '#bfe8ff'; ctx.fillRect(-2, -t.h / 2 + 4, 12, t.h - 8);
      ctx.fillStyle = '#222'; ctx.fillRect(t.w / 2 - 8, -t.h / 2 + 3, 5, t.h - 6);
      if (v.cop) { ctx.fillStyle = '#1b2a4a'; ctx.fillRect(-t.w / 2, -5, t.w, 10); ctx.fillStyle = (Math.floor(G.time * 4) % 2 ? '#ff4757' : '#3742fa'); ctx.fillRect(-6, -4, 12, 8); }
      if (t.taxi) { ctx.fillStyle = '#111'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
      if (v.health < 70) { ctx.fillStyle = 'rgba(60,60,60,' + (0.3 + Math.random() * 0.3) + ')'; ctx.beginPath(); ctx.arc(t.w / 2 - 4, 0, 6 + Math.random() * 5, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  function drawPed(ctx, G, pd) {
    const cam = G.camera, x = pd.x - cam.x, y = pd.y - cam.y;
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 7, 8, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = pd.color; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(x, y - 8, 4.5, 0, 7); ctx.fill();
  }
  function drawPlayer(ctx, G) {
    const p = G.player; if (p.vehicle) return;
    const x = p.x - G.camera.x, y = p.y - G.camera.y;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 9, 3.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff6b81'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(x, y - 9, 5, 0, 7); ctx.fill();
    // Held weapon points toward aim
    const w = SB.Player.WEAPONS[p.weapon];
    if (p.weapon > 0) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(p.angle) * 17, y + Math.sin(p.angle) * 17); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SOL', x, y - 20);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawHUD(ctx, G) {
    const p = G.player;
    // Top-left: district, clock, weather
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, 12, 12, 300, 62, 8); ctx.fill();
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 17px sans-serif';
    ctx.fillText(G.district || 'Solmar Bay', 22, 36);
    const hh = Math.floor(G.hour), mm = Math.floor((G.hour - hh) * 60);
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
    ctx.fillText((hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + '  ·  ' + G.weather + '  ·  Mission ' + Math.min(15, G.missionIndex + 1) + '/15', 22, 60);
    // Top-right: cash, weapon, wanted stars
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, W - 330, 12, 318, 86, 8); ctx.fill();
    ctx.fillStyle = '#7bed9f'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('$' + p.cash.toLocaleString(), W - 24, 42);
    const w = SB.Player.WEAPONS[p.weapon];
    ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif';
    ctx.fillText(w.name + (p.weapon > 0 ? '  ·  ' + Math.max(0, p.ammo[p.weapon]) + ' rounds' : ''), W - 24, 66);
    const stars = SB.Police.wantedCap(G);
    ctx.font = '22px sans-serif';
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < stars ? '#ffd700' : 'rgba(255,255,255,0.25)'; ctx.fillText('★', W - 150 + i * 26, 92); }
    if (G.seenByPolice && stars > 0) { ctx.fillStyle = '#ff6b81'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('POLICE IN PURSUIT', W - 24, 92); }
    // Bottom-left: health and armor bars
    bar(ctx, 16, H - 58, 210, 16, p.health / 100, '#e84118', 'HEALTH ' + Math.ceil(p.health));
    bar(ctx, 16, H - 36, 210, 12, p.armor / 100, '#74b9ff', 'ARMOR');
    if (p.vehicle) { ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(p.vehicle.type.name + '  ·  ' + Math.round(Math.abs(p.vehicle.speed) * 0.36) + ' km/h  ·  hull ' + Math.ceil(p.vehicle.health) + '%', 16, H - 70); }
    // Objective banner
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, W / 2 - 290, 12, 580, 34, 8); ctx.fill();
    ctx.fillStyle = '#ffe66d'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(SB.Missions.objectiveText(G), W / 2, 34);
    if (G.activity && G.activity.kind) {
      ctx.fillStyle = '#38b6ff'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Side job: ' + G.activity.kind + (G.activity.kind === 'rampage' ? ' — wrecks ' + G.activity.score + '/6' : '') + '  ·  ' + Math.max(0, Math.ceil(G.activity.timer)) + 's left', W / 2, 64);
    }
    if (G.bustT > 0.2) { ctx.fillStyle = '#ff4757'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('BUST METER — move!', W / 2, 110); }
    // Toasts
    ctx.textAlign = 'center'; ctx.font = 'bold 16px sans-serif';
    G.toasts.forEach((t, i) => { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, t.t) + ')'; ctx.fillText(t.text, W / 2, H - 120 - i * 24); });
    // Context hint
    ctx.font = '13px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'left';
    ctx.fillText(p.vehicle ? 'E — exit vehicle · Shift — boost · Space — handbrake' : 'E — enter vehicle / use marker · J — side job · R — rampage · 1-9 — weapons', 16, H - 8);
  }
  function bar(ctx, x, y, w, h, frac, color, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, x, y, w, h, 4); ctx.fill();
    ctx.fillStyle = color; if (frac > 0.01) { roundRect(ctx, x + 2, y + 2, (w - 4) * Math.max(0, Math.min(1, frac)), h - 4, 3); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, x + 6, y + h - 3);
  }
  function drawMinimap(ctx, G) {
    const mw = 218, mh = 158, mx = W - mw - 14, my = H - mh - 14;
    const sx = mw / SB.WORLD_W, sy = mh / SB.WORLD_H;
    ctx.save();
    ctx.beginPath(); roundRect(ctx, mx, my, mw, mh, 10); ctx.clip();
    ctx.fillStyle = '#2e6da8'; ctx.fillRect(mx, my, mw, mh);
    for (const d of SB.DISTRICTS) { ctx.fillStyle = d.ground; ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy); }
    ctx.strokeStyle = 'rgba(30,30,36,0.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const a of SB.AVENUES) { ctx.moveTo(mx + a * sx, my); ctx.lineTo(mx + a * sx, my + SB.OCEAN_Y * sy); }
    for (const b of SB.BOULEVARDS) { ctx.moveTo(mx, my + b * sy); ctx.lineTo(mx + SB.WORLD_W * sx, my + b * sy); }
    ctx.stroke();
    // Mission marker
    const m = SB.Missions.markerFor(G);
    if (m) { ctx.fillStyle = '#f5c542'; ctx.beginPath(); ctx.arc(mx + m.x * sx, my + m.y * sy, 4, 0, 7); ctx.fill(); }
    if (G.activity && G.activity.target) { ctx.fillStyle = '#38b6ff'; ctx.beginPath(); ctx.arc(mx + G.activity.target.x * sx, my + G.activity.target.y * sy, 3.5, 0, 7); ctx.fill(); }
    // Police blips
    for (const c of SB.Police.cops()) if (c.health > 0) { ctx.fillStyle = Math.floor(G.time * 3) % 2 ? '#ff4757' : '#3742fa'; ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4); }
    // Player arrow
    const p = G.player;
    ctx.save(); ctx.translate(mx + p.x * sx, my + p.y * sy); ctx.rotate(p.angle);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; roundRect(ctx, mx, my, mw, mh, 10); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('SOLMAR BAY', mx + 8, my + 14);
  }
  function drawDialogue(ctx, G) {
    const d = G.dialogue;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; roundRect(ctx, W / 2 - 360, H - 190, 720, 64, 10); ctx.fill();
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(d.who, W / 2 - 340, H - 162);
    ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif';
    ctx.fillText(d.text.slice(0, 84), W / 2 - 340, H - 140);
  }
  function drawPause(ctx, G) {
    ctx.fillStyle = 'rgba(5,8,20,0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 44px sans-serif';
    ctx.fillText('PAUSED', W / 2, 220);
    ctx.fillStyle = '#fff'; ctx.font = '19px sans-serif';
    const lines = ['P / Esc — resume', 'F — save game (also automatic at properties)', 'L — load saved game',
      'Missions finished: ' + G.missionIndex + ' / 15', 'Properties owned: ' + (G.owned.join(', ') || 'none yet'),
      'Casino hands played: ' + G.casinoPlays, '', 'Controls:'];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 280 + i * 28));
    ctx.font = '15px sans-serif';
    SB.KEYS_HELP.forEach((l, i) => ctx.fillText(l, W / 2, 280 + (lines.length + i) * 25));
  }
  return { drawWorld, drawVehicle, drawPed, drawPlayer, drawHUD, drawMinimap, drawDialogue, drawPause, roundRect, W, H, skyTint };
})();
