/**
 * Elderfall Lore Mod — villager lifecycle.
 *
 * - Spawns the seven residents (plus the ancient Guardian) around the
 *   village heart and binds each to their dialogue tree.
 * - Fallen villagers RESPAWN at the village square about a minute later;
 *   pending respawns are persisted so a world reload never loses anyone.
 * - Wandering traders (Fen Greenhollow and Sella Nightlantern) walk the
 *   roads between the hill villages: each arrives at dawn on their own
 *   cycle of days, trades until dusk, then moves on to the next town.
 */
import { world, system } from "@minecraft/server";
import { overworld, runQuiet, getVillageCenter, notify } from "./util.js";

export const RESIDENTS = {
  "lore:mayor_aldric": { name: "Mayor Aldric Veyne", scene: "mayor.root", dx: 0, dz: -10 },
  "lore:blacksmith_brenna": { name: "Brenna Ironsong", scene: "blacksmith.root", dx: 11, dz: -5 },
  "lore:historian_maelis": { name: "Maelis Vane", scene: "historian.root", dx: 12, dz: 3 },
  "lore:scout_kestrel": { name: "Kestrel Thorn", scene: "scout.root", dx: 5, dz: 10 },
  "lore:healer_liora": { name: "Liora Dawnpetal", scene: "healer.root", dx: -6, dz: 10 },
  "lore:trader_orin": { name: "Orin Fairwind", scene: "trader.root", dx: -12, dz: 3 },
  "lore:captain_roderic": { name: "Captain Roderic Hale", scene: "captain.root", dx: -11, dz: -5 }
};

export const WANDERERS = {
  "lore:wanderer_fen": {
    name: "Fen Greenhollow",
    scene: "fen.root",
    cycleDays: 4,
    arrive: "§e[Elderfall] A patchwork cart rattles through the east gate — §aFen Greenhollow§e the peddler has arrived, wares and rumors from the other villages in tow!",
    depart: "§7[Elderfall] Fen Greenhollow packs up the cart at dusk and rolls on toward the next town on the circuit."
  },
  "lore:wanderer_sella": {
    name: "Sella Nightlantern",
    scene: "sella.root",
    cycleDays: 6,
    arrive: "§d[Elderfall] A blue lantern sways at the east gate — §5Sella Nightlantern§d the relic dealer has come, and her wares hum faintly.",
    depart: "§7[Elderfall] Sella Nightlantern dims her lantern and slips away down the south road before full dark."
  }
};

export const ALL_VILLAGER_TYPES = [...Object.keys(RESIDENTS), ...Object.keys(WANDERERS)];

const RESPAWN_PROP = "lore:pending_respawns";
const RESPAWN_DELAY_TICKS = 1200; // one minute

function worldTime() {
  try {
    return world.getAbsoluteTime();
  } catch {
    return system.currentTick;
  }
}

export function currentDay() {
  return Math.floor(worldTime() / 24000);
}

function spawnNpc(typeId, name, scene, location) {
  const dimension = overworld();
  try {
    const npc = dimension.spawnEntity(typeId, location);
    npc.nameTag = name;
    runQuiet(npc, `dialogue change @s ${scene}`);
    return npc;
  } catch {
    return undefined;
  }
}

/** Spawn all seven residents + the square's Guardian. Skips types already alive. */
export function spawnResidents() {
  const center = getVillageCenter();
  if (!center) return;
  const dimension = overworld();
  for (const [typeId, def] of Object.entries(RESIDENTS)) {
    if (dimension.getEntities({ type: typeId }).length > 0) continue;
    spawnNpc(typeId, def.name, def.scene, {
      x: center.x + def.dx,
      y: center.y,
      z: center.z + def.dz
    });
  }
  if (dimension.getEntities({ type: "lore:elderfall_guardian" }).length === 0) {
    try {
      const guardian = dimension.spawnEntity("lore:elderfall_guardian", {
        x: center.x + 2,
        y: center.y,
        z: center.z + 4
      });
      guardian.nameTag = "Elderfall Guardian";
    } catch {
      // Blocked square; a later raid will summon one.
    }
  }
}

/* ------------------------------------------------------------------ */
/* Death and respawn                                                   */
/* ------------------------------------------------------------------ */

function readPending() {
  try {
    return JSON.parse(world.getDynamicProperty(RESPAWN_PROP) ?? "[]");
  } catch {
    return [];
  }
}

function writePending(list) {
  world.setDynamicProperty(RESPAWN_PROP, JSON.stringify(list));
}

/** Called from the entityDie handler when any named villager falls. */
export function queueRespawn(typeId) {
  const def = RESIDENTS[typeId] ?? WANDERERS[typeId];
  if (!def) return;
  const pending = readPending();
  pending.push({ type: typeId, due: worldTime() + RESPAWN_DELAY_TICKS });
  writePending(pending);
}

function processRespawns() {
  const center = getVillageCenter();
  if (!center) return;
  const now = worldTime();
  const pending = readPending();
  if (pending.length === 0) return;
  const remaining = [];
  for (const entry of pending) {
    if (entry.due > now) {
      remaining.push(entry);
      continue;
    }
    const resident = RESIDENTS[entry.type];
    if (resident) {
      const npc = spawnNpc(entry.type, resident.name, resident.scene, {
        x: center.x + resident.dx,
        y: center.y,
        z: center.z + resident.dz
      });
      if (npc) {
        world.sendMessage(`§a[Elderfall] §f${resident.name}§a limps back to the square — shaken, bandaged, and alive.`);
        notify("lore:villager_respawned", entry.type);
      } else {
        remaining.push(entry); // square blocked; try again next sweep
      }
    }
    // Fallen wanderers are not respawned here — they simply return on
    // their next circuit day, as the roads intended.
  }
  writePending(remaining);
}

/* ------------------------------------------------------------------ */
/* Wandering traders                                                   */
/* ------------------------------------------------------------------ */

function tickWanderers() {
  const center = getVillageCenter();
  if (!center) return;
  const day = currentDay();
  let timeOfDay;
  try {
    timeOfDay = world.getTimeOfDay();
  } catch {
    timeOfDay = 6000;
  }
  const isTradingHours = timeOfDay >= 200 && timeOfDay <= 11800;
  const dimension = overworld();

  for (const [typeId, def] of Object.entries(WANDERERS)) {
    const here = dimension.getEntities({ type: typeId });
    const dueToday = day > 0 && day % def.cycleDays === 0;

    if (dueToday && isTradingHours && here.length === 0) {
      const lastVisit = world.getDynamicProperty(`lore:visit_${typeId}`);
      if (lastVisit === day) continue; // already came and left (or was slain) today
      world.setDynamicProperty(`lore:visit_${typeId}`, day);
      const npc = spawnNpc(typeId, def.name, def.scene, {
        x: center.x + 17,
        y: center.y,
        z: center.z + 1
      });
      if (npc) {
        world.sendMessage(def.arrive);
        runQuiet(dimension, "playsound mob.villager.yes @a");
        notify("lore:wanderer_arrived", typeId);
      }
    } else if (!isTradingHours && here.length > 0) {
      for (const npc of here) {
        try {
          npc.remove();
        } catch {
          // Already gone.
        }
      }
      world.sendMessage(def.depart);
      notify("lore:wanderer_departed", typeId);
    }
  }
}

export function initVillagerLifecycle() {
  system.runInterval(() => {
    processRespawns();
  }, 100);
  system.runInterval(() => {
    tickWanderers();
  }, 200);
}
