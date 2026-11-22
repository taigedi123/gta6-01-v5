// Solmar Bay: Neon Shores — world constants, district map and tuning tables.
// Everything in this file is data: the shape of the city, the names of its
// neighbourhoods, and the numbers the other systems tune themselves against.
'use strict';
const SB = window.SB || (window.SB = {});

SB.WORLD_W = 4800;          // world width in pixels, west beach to east hills
SB.WORLD_H = 3400;          // world height, north hills to south ocean
SB.OCEAN_Y = 2920;          // waterline: south of this the bay begins
SB.TILE_ROAD = 92;          // road width used by the renderer and AI lanes

// Fourteen named districts. Each has a ground tint, a building palette and a
// flavour line the HUD shows when the player crosses into it.
SB.DISTRICTS = [
  { name: 'Downtown Solmar',    x: 1500, y: 1050, w: 1000, h: 800,  ground: '#8d9299', roof: ['#5b6b7d', '#71808f', '#46586e'], tall: true },
  { name: 'Marina Azul',        x: 1500, y: 2450, w: 900,  h: 470,  ground: '#c9b98a', roof: ['#e8e2d2', '#d7c9a8'], tall: false },
  { name: 'Coral Beachfront',   x: 0,    y: 2350, w: 1500, h: 570,  ground: '#e6d29a', roof: ['#f2e7c8', '#e8b4a0'], tall: false },
  { name: 'Casino Row',         x: 2500, y: 2350, w: 1100, h: 570,  ground: '#a08bb0', roof: ['#8e44ad', '#c0392b', '#d4ac0d'], tall: true },
  { name: 'Solmar Intl Airport', x: 3600, y: 2450, w: 1200, h: 470,  ground: '#9aa0a3', roof: ['#cfd6da'], tall: false, flat: true },
  { name: 'Palmetto Suburbs',   x: 2500, y: 1050, w: 1100, h: 800,  ground: '#7fae6d', roof: ['#b5654d', '#8f7f5f', '#6d8ea8'], tall: false },
  { name: 'Rusthook Docks',     x: 3600, y: 1550, w: 1200, h: 900,  ground: '#7d7468', roof: ['#8a6d4f', '#5f707a'], tall: false },
  { name: 'Verdant Hills',      x: 2500, y: 0,    w: 2300, h: 1050, ground: '#5f9455', roof: ['#caa27a', '#a8845c'], tall: false },
  { name: 'Old Town Mercado',   x: 0,    y: 1050, w: 1500, h: 800,  ground: '#c2a878', roof: ['#c96f4a', '#a85f3f', '#d9a05b'], tall: false },
  { name: 'University Quarter', x: 0,    y: 0,    w: 1500, h: 1050, ground: '#86a860', roof: ['#d8cf9f', '#9fb4c7'], tall: false },
  { name: 'Neon Mile',          x: 1500, y: 1850, w: 1000, h: 500,  ground: '#7a6f92', roof: ['#e84393', '#6c5ce7', '#00b8a9'], tall: true },
  { name: 'Canal District',     x: 1500, y: 0,    w: 1000, h: 1050, ground: '#6f9e8f', roof: ['#7fb3a3', '#5d8a7a'], tall: false },
  { name: 'Fisherman Flats',    x: 0,    y: 1850, w: 1500, h: 500,  ground: '#b0a284', roof: ['#94a7b8', '#c7b299'], tall: false },
  { name: 'Airport Heights',    x: 3600, y: 1050, w: 1200, h: 500,  ground: '#93a06b', roof: ['#b8a888', '#8fa3b8'], tall: false },
];

// Vertical avenues (west to east) and horizontal boulevards (north to south).
SB.AVENUES = [220, 760, 1300, 1840, 2380, 2920, 3460, 4000, 4540];
SB.BOULEVARDS = [240, 700, 1160, 1620, 2080, 2540, 2760];

SB.START = { x: 1960, y: 1618 }; // on the boulevard in Downtown Solmar, car parked just east
SB.KEYS_HELP = [
  'WASD / Arrows — move & drive', 'E — enter / exit vehicle, use marker',
  'Shift — sprint / boost', 'Space — handbrake / jump',
  'Mouse — aim, Click — fire', '1-9 — switch weapon',
  'E at a gold M station — ride the metro ($5)', 'P or Esc — pause', 'Properties with a ⌂ are save points',
];
