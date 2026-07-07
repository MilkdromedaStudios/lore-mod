/**
 * Elderfall Lore Mod — procedural village construction.
 *
 * When a fresh world initializes, Elderfall is BUILT around the first
 * player's spawn point: stone plaza and well, seven timber huts, a log
 * palisade with four gates, and the four compass watch posts that the
 * Perimeter Patrol quest walks. Commands are queued and drained a few
 * per tick so world-gen never stalls the server.
 */
import { system } from "@minecraft/server";
import { overworld, runQuiet } from "./util.js";

const COMMANDS_PER_TICK = 6;

function fill(queue, c, x0, y0, z0, x1, y1, z1, block) {
  queue.push(
    `fill ${c.x + x0} ${c.y + y0} ${c.z + z0} ${c.x + x1} ${c.y + y1} ${c.z + z1} ${block}`
  );
}

function set(queue, c, x, y, z, block) {
  queue.push(`setblock ${c.x + x} ${c.y + y} ${c.z + z} ${block}`);
}

function hut(queue, c, hx, hz, workBlock) {
  // 5x5 timber hut: plank floor, spruce walls, plank roof, south-facing door gap.
  fill(queue, c, hx - 2, -1, hz - 2, hx + 2, -1, hz + 2, "oak_planks");
  fill(queue, c, hx - 2, 0, hz - 2, hx + 2, 2, hz + 2, "spruce_planks");
  fill(queue, c, hx - 1, 0, hz - 1, hx + 1, 2, hz + 1, "air");
  fill(queue, c, hx, 0, hz + 2, hx, 1, hz + 2, "air"); // doorway
  fill(queue, c, hx - 2, 3, hz - 2, hx + 2, 3, hz + 2, "oak_planks");
  set(queue, c, hx - 1, 1, hz - 2, "glass"); // window
  set(queue, c, hx + 1, 1, hz - 2, "glass");
  set(queue, c, hx + 1, 0, hz - 1, "torch"); // floor torch in the corner
  if (workBlock) set(queue, c, hx - 1, 0, hz - 1, workBlock);
}

/**
 * Queue every build command for the village, then drain the queue a few
 * commands per tick. Calls onDone() once the last block is placed.
 */
export function buildVillage(center, onDone) {
  const c = { x: Math.floor(center.x), y: Math.floor(center.y), z: Math.floor(center.z) };
  const queue = [];

  // Clear the site and lay the ground (radius 20).
  fill(queue, c, -20, 0, -20, 20, 6, 20, "air");
  fill(queue, c, -20, -1, -20, 20, -1, 20, "grass_block");
  fill(queue, c, -20, -3, -20, 20, -2, 20, "dirt");

  // Plaza and the old well.
  fill(queue, c, -6, -1, -6, 6, -1, 6, "stone_bricks");
  fill(queue, c, -6, -1, -6, -6, -1, 6, "cobblestone");
  fill(queue, c, 6, -1, -6, 6, -1, 6, "cobblestone");
  fill(queue, c, -1, 0, -1, 1, 1, 1, "cobblestone");
  fill(queue, c, 0, 0, 0, 0, 1, 0, "water");
  set(queue, c, -1, 2, -1, "torch");
  set(queue, c, 1, 2, 1, "torch");

  // Seven huts ringing the plaza — one per resident.
  hut(queue, c, 0, -12, "lectern");            // Mayor Aldric's hall
  hut(queue, c, 11, -7, "blast_furnace");      // Brenna's forge
  hut(queue, c, 12, 5, "bookshelf");           // Maelis's archive
  hut(queue, c, 5, 12, "fletching_table");     // Kestrel's lodge
  hut(queue, c, -6, 12, "brewing_stand");      // Liora's infirmary
  hut(queue, c, -12, 5, "barrel");             // Orin's trade post
  hut(queue, c, -11, -7, "smithing_table");    // Roderic's watch house

  // Palisade ring (radius 19) with gates at the four compass points.
  const radius = 19;
  for (let angle = 0; angle < 360; angle += 5) {
    const rad = (angle * Math.PI) / 180;
    const px = Math.round(radius * Math.cos(rad));
    const pz = Math.round(radius * Math.sin(rad));
    // Leave 20-degree gates facing N/E/S/W.
    const nearGate = [0, 90, 180, 270].some(
      (gate) => Math.abs(((angle - gate + 540) % 360) - 180) <= 10
    );
    if (nearGate) continue;
    fill(queue, c, px, 0, pz, px, 2, pz, "oak_log");
    if (angle % 20 === 0) set(queue, c, px, 3, pz, "torch");
  }

  // Compass watch posts at radius 24 — the Perimeter Patrol sites.
  for (const [wx, wz] of [[0, -24], [24, 0], [0, 24], [-24, 0]]) {
    fill(queue, c, wx, -1, wz, wx, 3, wz, "cobblestone");
    set(queue, c, wx, 4, wz, "torch");
  }

  // Anchor the world here.
  queue.push(`setworldspawn ${c.x} ${c.y} ${c.z}`);

  const dimension = overworld();
  const timer = system.runInterval(() => {
    for (let i = 0; i < COMMANDS_PER_TICK && queue.length > 0; i++) {
      runQuiet(dimension, queue.shift());
    }
    if (queue.length === 0) {
      system.clearRun(timer);
      if (onDone) onDone();
    }
  }, 1);
}
