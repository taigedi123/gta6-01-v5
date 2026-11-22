// City generation: roads, city blocks, buildings, palms, docks and the metro
// line. Deterministic from a small seeded RNG so every visit sees one city.
'use strict';
SB.World = (() => {
  let seed = 1234567;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  const buildings = [];   // {x,y,w,h,color,roof,name?}
  const palms = [];
  const lamps = [];
  const props = [];       // crates, barriers, market stalls
  const docks = [];

  function districtAt(x, y) {
    for (const d of SB.DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    return null;
  }
  function onRoad(x, y) {
    for (const a of SB.AVENUES) if (Math.abs(x - a) < SB.TILE_ROAD / 2) return true;
    for (const b of SB.BOULEVARDS) if (Math.abs(y - b) < SB.TILE_ROAD / 2) return true;
    return false;
  }
  function nearRoadCenter(x, y, pad) {
    for (const a of SB.AVENUES) if (Math.abs(x - a) < pad) return true;
    for (const b of SB.BOULEVARDS) if (Math.abs(y - b) < pad) return true;
    return false;
  }

  function buildCity() {
    buildings.length = 0; palms.length = 0; lamps.length = 0; props.length = 0; docks.length = 0;
    // Blocks sit between avenues and boulevards; fill each with buildings.
    const xs = [0, ...SB.AVENUES, SB.WORLD_W], ys = [0, ...SB.BOULEVARDS, SB.OCEAN_Y];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const bx = xs[i] + SB.TILE_ROAD / 2 + 14, by = ys[j] + SB.TILE_ROAD / 2 + 14;
      const bw = xs[i + 1] - xs[i] - SB.TILE_ROAD - 28, bh = ys[j + 1] - ys[j] - SB.TILE_ROAD - 28;
      if (bw < 90 || bh < 90) continue;
      const d = districtAt(bx + bw / 2, by + bh / 2);
      if (!d || d.flat) continue;
      const cols = bw > 340 ? 2 : 1, rows = bh > 340 ? 2 : 1;
      for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
        if (rnd() < 0.14) continue; // leave some lots open as car parks / plazas
        const w = (bw / cols) * (0.62 + rnd() * 0.3), h = (bh / rows) * (0.62 + rnd() * 0.3);
        buildings.push({
          x: bx + (bw / cols) * cx + (bw / cols - w) / 2, y: by + (bh / rows) * cy + (bh / rows - h) / 2,
          w, h, color: pick(d.roof), tall: d.tall && rnd() < 0.7, floors: d.tall ? 6 + Math.floor(rnd() * 10) : 2 + Math.floor(rnd() * 3),
        });
      }
      if (rnd() < 0.6) palms.push({ x: bx + rnd() * bw, y: by + rnd() * bh });
    }
    // Beach palms and dock planks along the waterfront.
    for (let x = 60; x < SB.WORLD_W - 60; x += 90 + rnd() * 120) palms.push({ x, y: SB.OCEAN_Y - 40 - rnd() * 60 });
    for (let x = 1650; x < 2350; x += 130) docks.push({ x, y: SB.OCEAN_Y + 30, w: 60, h: 190 });
    for (let x = 300; x < SB.WORLD_W; x += 260) lamps.push({ x: x + 40, y: 200 });
    for (let i = 0; i < 90; i++) {
      const x = rnd() * SB.WORLD_W, y = rnd() * (SB.OCEAN_Y - 80);
      if (!onRoad(x, y)) props.push({ x, y, kind: pick(['crate', 'stall', 'barrel', 'bench']) });
    }
  }

  // Metro: one elevated loop line with eight stations.
  const METRO_STATIONS = [
    { name: 'Mercado Central', x: 760, y: 700 }, { name: 'University', x: 760, y: 240 },
    { name: 'Canal Walk', x: 1840, y: 240 }, { name: 'Downtown Solmar', x: 1840, y: 1160 },
    { name: 'Neon Mile', x: 2380, y: 2080 }, { name: 'Marina Azul', x: 1840, y: 2540 },
    { name: 'Casino Row', x: 2920, y: 2540 }, { name: 'Airport', x: 4000, y: 2540 },
  ];
  function collideCircle(x, y, r) {
    // Returns a corrected position pushed out of any building footprint.
    for (const b of buildings) {
      if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) {
        const left = x - (b.x - r), right = (b.x + b.w + r) - x, top = y - (b.y - r), bot = (b.y + b.h + r) - y;
        const m = Math.min(left, right, top, bot);
        if (m === left) x = b.x - r; else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r; else y = b.y + b.h + r;
      }
    }
    return { x: Math.max(16, Math.min(SB.WORLD_W - 16, x)), y: Math.max(16, Math.min(SB.WORLD_H - 16, y)) };
  }
  function buildingAt(x, y) {
    for (const b of buildings) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    return null;
  }
  buildCity();
  return { buildings, palms, lamps, props, docks, districtAt, onRoad, nearRoadCenter, collideCircle, buildingAt, METRO_STATIONS, rnd };
})();
