// Vehicles, traffic and pedestrians: the living layer of Solmar Bay.
// Cars follow the avenue/boulevard grid, stop for trouble, and can be stolen.
'use strict';
SB.Entities = (() => {
  const CAR_TYPES = [
    { name: 'Palmetto Coupe',   speed: 265, accel: 190, grip: 3.4, color: '#e74c3c', w: 46, h: 22 },
    { name: 'Solmar Sedan',     speed: 235, accel: 165, grip: 3.2, color: '#ecf0f1', w: 48, h: 22 },
    { name: 'Bayside Taxi',     speed: 240, accel: 170, grip: 3.2, color: '#f1c40f', w: 48, h: 22, taxi: true },
    { name: 'Rusthook Pickup',  speed: 220, accel: 150, grip: 2.9, color: '#7f8c8d', w: 52, h: 24 },
    { name: 'Neon GT',          speed: 330, accel: 260, grip: 3.9, color: '#9b59b6', w: 48, h: 21 },
    { name: 'Mercado Van',      speed: 200, accel: 130, grip: 2.7, color: '#3498db', w: 54, h: 26 },
    { name: 'Dune Buggy',       speed: 250, accel: 210, grip: 3.0, color: '#e67e22', w: 44, h: 24 },
    { name: 'Limousine Sol',    speed: 225, accel: 140, grip: 2.8, color: '#2c3e50', w: 66, h: 23 },
    { name: 'Campus Hatch',     speed: 215, accel: 155, grip: 3.3, color: '#1abc9c', w: 42, h: 21 },
    { name: 'Dockside Truck',   speed: 185, accel: 110, grip: 2.5, color: '#95a5a6', w: 60, h: 27 },
    { name: 'Convertible Sol',  speed: 290, accel: 230, grip: 3.7, color: '#fd79a8', w: 47, h: 21 },
    { name: 'Police Interceptor', speed: 315, accel: 245, grip: 3.8, color: '#dfe6e9', w: 49, h: 22, police: true },
  ];
  const BOAT_TYPES = [
    { name: 'Skiff', speed: 150, color: '#f5f6fa' },
    { name: 'Wave Runner Yacht', speed: 210, color: '#00a8ff' },
    { name: 'Rum Runner', speed: 185, color: '#e84118' },
  ];
  let nextId = 1;
  const cars = [], peds = [], boats = [];

  function makeCar(typeIdx, x, y, angle) {
    const t = CAR_TYPES[typeIdx % CAR_TYPES.length];
    return { id: nextId++, kind: 'car', type: t, x, y, angle: angle || 0, speed: 0, health: 100,
             driver: 'traffic', color: t.color, honkT: 0, stuckT: 0, lane: 1 };
  }
  function makeBoat(typeIdx, x, y) {
    const t = BOAT_TYPES[typeIdx % BOAT_TYPES.length];
    return { id: nextId++, kind: 'boat', type: t, x, y, angle: -Math.PI / 2, speed: 0, health: 100, driver: 'moored', color: t.color };
  }
  function makePed(x, y) {
    const shirts = ['#e17055', '#00b894', '#0984e3', '#fdcb6e', '#d63031', '#6c5ce7', '#ffffff'];
    return { id: nextId++, kind: 'ped', x, y, angle: Math.random() * 6.28, speed: 0, health: 100,
             color: shirts[Math.floor(Math.random() * shirts.length)], state: 'walk', panicT: 0, walkT: Math.random() * 3 };
  }
  function spawnInitialTraffic(G) {
    cars.length = 0; peds.length = 0; boats.length = 0;
    for (let i = 0; i < 34; i++) {
      const vertical = Math.random() < 0.5;
      const a = vertical ? SB.AVENUES[Math.floor(Math.random() * SB.AVENUES.length)]
                         : SB.BOULEVARDS[Math.floor(Math.random() * SB.BOULEVARDS.length)];
      const along = 200 + Math.random() * (vertical ? SB.OCEAN_Y - 400 : SB.WORLD_W - 400);
      const c = vertical ? makeCar(i, a + 22, along, Math.PI / 2) : makeCar(i, along, a + 22, 0);
      c.speed = 60 + Math.random() * 60; cars.push(c);
    }
    for (let i = 0; i < 46; i++) {
      let x = Math.random() * SB.WORLD_W, y = Math.random() * (SB.OCEAN_Y - 60);
      if (SB.World.onRoad(x, y)) { x += 70; }
      peds.push(makePed(x, y));
    }
    SB.World.docks.forEach((d, i) => { if (i % 2 === 0) boats.push(makeBoat(i / 2, d.x + 30, d.y + 230)); });
    // The player's first ride: a coupe parked by the start corner.
    const first = makeCar(0, SB.START.x + 90, SB.START.y + 60, 0); first.driver = 'parked'; cars.push(first);
    // Parked cars scattered on side streets: stealable rides all over town.
    for (let i = 0; i < 22; i++) {
      const a = SB.AVENUES[Math.floor(Math.random() * SB.AVENUES.length)];
      const b = SB.BOULEVARDS[Math.floor(Math.random() * SB.BOULEVARDS.length)];
      const c = makeCar(i + 2, a + 58, b + 90 + Math.random() * 260, Math.PI / 2);
      c.driver = 'parked'; cars.push(c);
    }
    // A couple of boats cruising the bay on their own.
    for (let i = 0; i < 3; i++) {
      const b = makeBoat(i, 500 + i * 1500, 3050 + i * 90);
      b.driver = 'traffic'; b.angle = i % 2 ? Math.PI : 0; boats.push(b);
    }
  }

  function nearestVehicle(G, x, y, maxDist) {
    let best = null, bd = maxDist;
    for (const list of [cars, boats]) for (const v of list) {
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  return { CAR_TYPES, BOAT_TYPES, cars, peds, boats, makeCar, makeBoat, makePed, spawnInitialTraffic, nearestVehicle };
})();
