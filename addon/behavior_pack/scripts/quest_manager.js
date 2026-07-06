/**
 * Elderfall Lore Mod — quest engine.
 *
 * Quest state is stored per player in dynamic properties:
 *   lore:q_<id>   0/undefined = not started, 1 = active, 2 = completed
 *   lore:qp_<id>  progress (kill count, or a visited-sites bitmask)
 *
 * Dialogue buttons drive the engine through scriptevents:
 *   /scriptevent lore:quest accept <id>
 *   /scriptevent lore:quest turnin <id>
 *   /scriptevent lore:quest begin_escort
 *   /scriptevent lore:quest status
 */
import { world } from "@minecraft/server";
import { QUESTS, QUEST_ORDER } from "./quest_data.js";
import { addReputation } from "./reputation.js";
import {
  overworld,
  alive,
  notify,
  runQuiet,
  playSound,
  title,
  countItem,
  removeItem,
  getVillageCenter,
  horizontalDistance
} from "./util.js";

export const STATE = { NOT_STARTED: 0, ACTIVE: 1, COMPLETED: 2 };

export function getState(player, questId) {
  const value = player.getDynamicProperty(`lore:q_${questId}`);
  return typeof value === "number" ? value : STATE.NOT_STARTED;
}

function setState(player, questId, state) {
  player.setDynamicProperty(`lore:q_${questId}`, state);
}

function getProgress(player, questId) {
  const value = player.getDynamicProperty(`lore:qp_${questId}`);
  return typeof value === "number" ? value : 0;
}

function setProgress(player, questId, value) {
  player.setDynamicProperty(`lore:qp_${questId}`, value);
}

export function acceptQuest(player, questId) {
  const quest = QUESTS[questId];
  if (!quest) {
    player.sendMessage(`§c[Elderfall] Unknown quest: ${questId}`);
    return;
  }
  const state = getState(player, questId);
  if (state === STATE.ACTIVE) {
    player.sendMessage(`§e[Elderfall] '${quest.name}' is already in your quest log.`);
    return;
  }
  if (state === STATE.COMPLETED) {
    player.sendMessage(`§a[Elderfall] You have already completed '${quest.name}'.`);
    return;
  }
  for (const prereq of quest.prerequisites) {
    if (getState(player, prereq) !== STATE.COMPLETED) {
      player.sendMessage(
        `§c[Elderfall] ${quest.giver} shakes their head: complete '${QUESTS[prereq].name}' first.`
      );
      return;
    }
  }
  if (quest.objective.kind === "visit" && !getVillageCenter()) {
    player.sendMessage(
      "§c[Elderfall] The village heart has not been marked. An elder must run §f/function elderfall/setup§c at the village square first."
    );
    return;
  }
  setState(player, questId, STATE.ACTIVE);
  setProgress(player, questId, 0);
  player.sendMessage(quest.acceptText);
  playSound(player, "random.orb");
  notify("lore:quest_accepted", `${questId} ${player.name}`);
}

export function completeQuest(player, questId) {
  const quest = QUESTS[questId];
  if (!quest || getState(player, questId) !== STATE.ACTIVE) return;
  setState(player, questId, STATE.COMPLETED);
  for (const reward of quest.rewards.items) {
    runQuiet(player, `give @s ${reward.id} ${reward.count}`);
  }
  if (quest.rewards.xpLevels > 0) {
    runQuiet(player, `xp ${quest.rewards.xpLevels}L @s`);
  }
  player.sendMessage(quest.completeText);
  title(player, "§6Quest Complete", `§f${quest.name}`);
  playSound(player, "lore.quest_complete");
  addReputation(quest.rewards.reputation, `§f${player.name}§7 completed '${quest.name}'`);
  notify("lore:quest_completed", `${questId} ${player.name}`);
}

/** Gather quests: verify the goods, take them, pay out. */
export function turnInQuest(player, questId) {
  const quest = QUESTS[questId];
  if (!quest) return;
  const state = getState(player, questId);
  if (state === STATE.COMPLETED) {
    player.sendMessage(`§a[Elderfall] '${quest.name}' is already done. ${quest.giver} thanks you again.`);
    return;
  }
  if (state !== STATE.ACTIVE) {
    player.sendMessage(`§e[Elderfall] Accept '${quest.name}' before turning it in.`);
    return;
  }
  if (quest.objective.kind !== "gather") {
    player.sendMessage(`§e[Elderfall] '${quest.name}' completes on its own — check your quest log for progress.`);
    return;
  }
  const missing = [];
  for (const need of quest.objective.items) {
    const have = countItem(player, need.id);
    if (have < need.count) {
      missing.push(`§f${need.count - have}§7 more ${need.id.replace("minecraft:", "").replace(/_/g, " ")}`);
    }
  }
  if (missing.length > 0) {
    player.sendMessage(`§7[Elderfall] ${quest.giver} tallies your goods — still short: ${missing.join("§7, ")}§7.`);
    return;
  }
  for (const need of quest.objective.items) {
    removeItem(player, need.id, need.count);
  }
  completeQuest(player, questId);
}

/** Kill-quest hook, called from the entityDie listener in main.js. */
export function recordKill(player, deadTypeId) {
  for (const questId of QUEST_ORDER) {
    const quest = QUESTS[questId];
    if (quest.objective.kind !== "kill") continue;
    if (getState(player, questId) !== STATE.ACTIVE) continue;
    if (!quest.objective.targets.includes(deadTypeId)) continue;
    const progress = getProgress(player, questId) + 1;
    setProgress(player, questId, progress);
    if (progress >= quest.objective.count) {
      completeQuest(player, questId);
    } else {
      player.sendMessage(`§7[${quest.name}] §f${progress}§7/§f${quest.objective.count}§7 Corrupted slain.`);
    }
  }
}

/** Visit-quest sweep, called every second from main.js. */
export function checkVisitQuests() {
  const center = getVillageCenter();
  if (!center) return;
  for (const player of world.getPlayers()) {
    for (const questId of QUEST_ORDER) {
      const quest = QUESTS[questId];
      if (quest.objective.kind !== "visit") continue;
      if (getState(player, questId) !== STATE.ACTIVE) continue;
      let mask = getProgress(player, questId);
      let changed = false;
      quest.objective.sites.forEach((site, index) => {
        const bit = 1 << index;
        if (mask & bit) return;
        const target = { x: center.x + site.dx, z: center.z + site.dz };
        if (horizontalDistance(player.location, target) <= quest.objective.radius) {
          mask |= bit;
          changed = true;
          const done = countBits(mask);
          player.sendMessage(
            `§7[${quest.name}] §b${site.label}§7 reached (§f${done}§7/§f${quest.objective.sites.length}§7). The stones hum beneath your feet.`
          );
          playSound(player, "random.orb");
          runQuiet(player, "particle minecraft:endrod ~ ~1 ~");
        }
      });
      if (changed) {
        setProgress(player, questId, mask);
        if (countBits(mask) >= quest.objective.sites.length) {
          completeQuest(player, questId);
        }
      }
    }
  }
}

function countBits(mask) {
  let n = 0;
  while (mask) {
    n += mask & 1;
    mask >>= 1;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Escort quest: The Last Caravan                                      */
/* ------------------------------------------------------------------ */

const ESCORT_QUEST = "the_last_caravan";
const CARAVAN_TAG = "lore_caravan";
let escort; // { playerId, caravanId, ticksLeft, totalTicks, ambushesLeft }

export function beginEscort(player) {
  const quest = QUESTS[ESCORT_QUEST];
  if (getState(player, ESCORT_QUEST) !== STATE.ACTIVE) {
    player.sendMessage(`§e[Elderfall] Accept '${quest.name}' from Kestrel before signalling the caravan.`);
    return;
  }
  if (escort) {
    player.sendMessage("§e[Elderfall] The caravan is already on the road!");
    return;
  }
  const dimension = overworld();
  let caravan;
  try {
    const spawnAt = {
      x: player.location.x + 4,
      y: player.location.y,
      z: player.location.z + 4
    };
    caravan = dimension.spawnEntity(quest.objective.escortEntity, spawnAt);
    caravan.nameTag = "§eOrin's Caravan§r";
    caravan.addTag(CARAVAN_TAG);
  } catch {
    player.sendMessage("§c[Elderfall] The caravan could not set out here. Try open ground.");
    return;
  }
  const totalTicks = quest.objective.durationSeconds * 20;
  escort = {
    playerId: player.id,
    caravanId: caravan.id,
    ticksLeft: totalTicks,
    totalTicks,
    ambushesLeft: quest.objective.ambushes
  };
  world.sendMessage("§6[The Last Caravan] §fThe caravan sets out! Keep Orin alive until it reaches the gates.");
  title(player, "§6The Last Caravan", "§cProtect the caravan!");
  playSound(player, "lore.raid_horn");
  notify("lore:escort_started", player.name);
}

/** Escort tick, called every second from main.js. */
export function tickEscort() {
  if (!escort) return;
  const player = world.getEntity(escort.playerId);
  const caravan = world.getEntity(escort.caravanId);

  if (!alive(caravan)) {
    escort = undefined;
    world.sendMessage("§c[The Last Caravan] The caravan has fallen! Signal Kestrel to try again once the road clears.");
    if (alive(player)) {
      title(player, "§cCaravan Lost", "§7Speak with Kestrel to try again");
      playSound(player, "mob.wither.death");
    }
    notify("lore:escort_failed", "caravan_destroyed");
    return;
  }

  escort.ticksLeft -= 20;

  // Three ambushes, spaced across the run.
  const elapsed = escort.totalTicks - escort.ticksLeft;
  const interval = Math.floor(escort.totalTicks / (QUESTS[ESCORT_QUEST].objective.ambushes + 1));
  const ambushesDue = Math.min(
    QUESTS[ESCORT_QUEST].objective.ambushes,
    Math.floor(elapsed / interval)
  );
  const ambushesSpawned = QUESTS[ESCORT_QUEST].objective.ambushes - escort.ambushesLeft;
  if (ambushesDue > ambushesSpawned) {
    escort.ambushesLeft--;
    spawnAmbush(caravan.location);
    world.sendMessage("§c[The Last Caravan] Corrupted burst from the treeline — defend the caravan!");
  }

  const secondsLeft = Math.ceil(escort.ticksLeft / 20);
  if (alive(player) && secondsLeft % 15 === 0 && secondsLeft > 0) {
    player.sendMessage(`§7[The Last Caravan] §f${secondsLeft}s§7 until the caravan reaches the gates.`);
  }

  if (escort.ticksLeft <= 0) {
    const escortPlayer = player;
    const survivor = caravan;
    escort = undefined;
    try {
      survivor.remove();
    } catch {
      // Already gone — the arrival still counts.
    }
    if (alive(escortPlayer)) {
      completeQuest(escortPlayer, ESCORT_QUEST);
    }
    notify("lore:escort_completed", "caravan_arrived");
  }
}

function spawnAmbush(location) {
  const dimension = overworld();
  for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 9 + Math.random() * 5;
    try {
      const raider = dimension.spawnEntity("lore:corrupted_raider", {
        x: location.x + Math.cos(angle) * radius,
        y: location.y,
        z: location.z + Math.sin(angle) * radius
      });
      raider.addTag("lore_ambush_mob");
    } catch {
      // Unloaded or blocked spawn point; the caravan gets a lucky mile.
    }
  }
}

/* ------------------------------------------------------------------ */
/* Quest log                                                           */
/* ------------------------------------------------------------------ */

export function reportStatus(player) {
  player.sendMessage("§6═══ The Chronicle of Elderfall — Quest Log ═══");
  for (const questId of QUEST_ORDER) {
    const quest = QUESTS[questId];
    const state = getState(player, questId);
    if (state === STATE.COMPLETED) {
      player.sendMessage(`§a ✔ ${quest.name}§7 — complete`);
    } else if (state === STATE.ACTIVE) {
      player.sendMessage(`§e ◆ ${quest.name}§7 — ${progressLine(player, quest)}`);
    } else {
      player.sendMessage(`§8 ✖ ${quest.name} — see ${quest.giver}`);
    }
  }
}

function progressLine(player, quest) {
  const objective = quest.objective;
  if (objective.kind === "gather") {
    const parts = objective.items.map((need) => {
      const have = Math.min(countItem(player, need.id), need.count);
      return `${have}/${need.count} ${need.id.replace("minecraft:", "").replace(/_/g, " ")}`;
    });
    return `carrying ${parts.join(", ")}`;
  }
  if (objective.kind === "kill") {
    return `${getProgress(player, quest.id)}/${objective.count} slain`;
  }
  if (objective.kind === "visit") {
    return `${countBits(getProgress(player, quest.id))}/${objective.sites.length} sites`;
  }
  if (objective.kind === "escort") {
    return escort ? "caravan on the road!" : "signal Kestrel when ready";
  }
  if (objective.kind === "raid") {
    return "sound the horn at Aldric's hall";
  }
  return "in progress";
}

/** Admin/debug: wipe one player's quest state. */
export function resetQuests(player) {
  for (const questId of QUEST_ORDER) {
    player.setDynamicProperty(`lore:q_${questId}`, undefined);
    player.setDynamicProperty(`lore:qp_${questId}`, undefined);
  }
  player.sendMessage("§7[Elderfall] Your chronicle has been wiped clean. The stones forget… for now.");
}
