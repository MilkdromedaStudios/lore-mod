/**
 * Elderfall Lore Mod — entry point.
 *
 * Wires together: automatic village construction at world spawn, the
 * origin story, dialogue-driven quests, the raid + 20-day outbreak
 * loops, villager combat respawns, wandering traders, legendary
 * equipment abilities, the mana/spell system, and village reputation.
 *
 * Scriptevent command surface (used by dialogue buttons and functions):
 *   lore:quest      accept <id> | turnin <id> | begin_escort | status | resetall
 *   lore:village    setcenter | rebuild
 *   lore:raid       start | stop | status
 *   lore:outbreak   status | start
 *   lore:shop       buy <goodId>
 *   lore:reputation query | add <n>
 *   lore:story      tell
 */
import { world, system, Player } from "@minecraft/server";
import {
  acceptQuest,
  turnInQuest,
  completeQuest,
  recordKill,
  checkVisitQuests,
  beginEscort,
  tickEscort,
  reportStatus,
  resetQuests,
  getState,
  STATE
} from "./quest_manager.js";
import { startRaid, stopRaid, tickRaid, reportRaid, resumeRaidIfNeeded } from "./raid_manager.js";
import { addReputation, reportReputation } from "./reputation.js";
import { initArmorPassives, buyGood } from "./equipment.js";
import { initMana, castSpell } from "./mana.js";
import { buildVillage } from "./village_builder.js";
import {
  ALL_VILLAGER_TYPES,
  spawnResidents,
  queueRespawn,
  initVillagerLifecycle
} from "./villagers.js";
import { initOutbreaks, recordOutbreakVictory, reportOutbreak } from "./outbreak.js";
import {
  overworld,
  eventPlayer,
  runQuiet,
  playSound,
  title,
  actionbar,
  setVillageCenter,
  getVillageCenter,
  compassDirection
} from "./util.js";

const STORY_LINES = [
  "§7You wake on cold stone with the taste of centuries in your mouth.",
  "§7Around you, a village raises itself from pale ruins — as if it had only been waiting for you to open your eyes. Elder trees grow through broken arches. A bell tower with no bell stands silent.",
  "§7A voice: §f\"It's true. The lanterns burned blue, and the tower rang, and now you.\"",
  "§7They call this place §6Elderfall§7. They call you the §bAwoken§7 — the protector their carvings promised when the seal beneath the shrine grew thin.",
  "§7In the hills, something that traded away its every memory is mustering the bodies of the dead. §cEvery twentieth day, the seal exhales — and they march.§7",
  "§eSpeak with §6Mayor Aldric Veyne§e in the square to begin.",
  "§8(Traders wander in from the other villages every few days. Emeralds buy blades, armor, and spell tomes.)"
];

/* ------------------------------------------------------------------ */
/* World initialization: the village builds itself at spawn            */
/* ------------------------------------------------------------------ */

const INIT_PROP = "lore:world_initialized";

function initializeWorld(player) {
  world.setDynamicProperty(INIT_PROP, true);
  // Anchor the village on solid ground at the first player's feet.
  setVillageCenter(player.location);
  world.sendMessage("§7[Elderfall] §oThe old stones stir. Walls remember themselves...§r");
  buildVillage(player.location, () => {
    spawnResidents();
    world.sendMessage("§a[Elderfall] The village stands. Its people are waiting for you in the square.");
    runQuiet(player, "playsound random.levelup @s");
  });
}

function tellStory(player) {
  title(player, "§6ELDERFALL", "§bThe Awoken has come");
  playSound(player, "lore.awoken_bell");
  STORY_LINES.forEach((line, index) => {
    system.runTimeout(() => {
      try {
        player.sendMessage(line);
      } catch {
        // Player left mid-story.
      }
    }, 60 + index * 70);
  });
}

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  const player = event.player;

  // First player into a fresh world founds Elderfall automatically.
  // (Worlds set up under v1.0.0 already have a center; just mark them done.)
  if (world.getDynamicProperty(INIT_PROP) !== true) {
    if (getVillageCenter()) {
      world.setDynamicProperty(INIT_PROP, true);
    } else {
      system.runTimeout(() => initializeWorld(player), 20);
    }
  }

  if (player.getDynamicProperty("lore:welcomed") === true) return;
  player.setDynamicProperty("lore:welcomed", true);
  system.runTimeout(() => tellStory(player), 60);
  runQuiet(player, "function elderfall/give_starter_kit");
});

/* ------------------------------------------------------------------ */
/* Scriptevent dispatcher                                              */
/* ------------------------------------------------------------------ */

system.afterEvents.scriptEventReceive.subscribe((event) => {
  const player = eventPlayer(event);
  const args = (event.message ?? "").trim().split(/\s+/);
  const verb = args[0] ?? "";

  switch (event.id) {
    case "lore:quest": {
      if (!player) return;
      if (verb === "accept" && args[1]) acceptQuest(player, args[1]);
      else if (verb === "turnin" && args[1]) turnInQuest(player, args[1]);
      else if (verb === "begin_escort") beginEscort(player);
      else if (verb === "status") reportStatus(player);
      else if (verb === "resetall") resetQuests(player);
      else player.sendMessage("§c[Elderfall] Usage: lore:quest accept|turnin <id> | begin_escort | status | resetall");
      break;
    }
    case "lore:village": {
      if (!player) return;
      if (verb === "setcenter") {
        setVillageCenter(player.location);
        player.sendMessage("§a[Elderfall] The village heart has been marked here. Quest sites, raids and outbreaks now anchor to this square.");
        playSound(player, "random.orb");
      } else if (verb === "rebuild") {
        initializeWorld(player);
      }
      break;
    }
    case "lore:raid": {
      if (verb === "start") startRaid(player, event.sourceEntity);
      else if (verb === "stop") stopRaid(player);
      else if (verb === "status" && player) reportRaid(player);
      break;
    }
    case "lore:outbreak": {
      if (verb === "status" && player) reportOutbreak(player);
      else if (verb === "start") {
        // Admin/test: force an outbreak-strength raid now.
        startRaid(player, event.sourceEntity, { source: "outbreak", level: 1 });
      }
      break;
    }
    case "lore:shop": {
      if (verb === "buy" && args[1] && player) buyGood(player, args[1]);
      break;
    }
    case "lore:reputation": {
      if (verb === "query" && player) reportReputation(player);
      else if (verb === "add" && args[1] && !Number.isNaN(Number(args[1]))) {
        addReputation(Number(args[1]), "decree of the elders");
      }
      break;
    }
    case "lore:story": {
      if (verb === "tell" && player) tellStory(player);
      break;
    }
    case "lore:raid_victory": {
      // Notification fired by the raid system. Complete raid-bound quests.
      const source = verb; // "horn" or "outbreak"
      if (source === "outbreak") recordOutbreakVictory();
      for (const onlinePlayer of world.getPlayers()) {
        if (getState(onlinePlayer, "siege_of_elderfall") === STATE.ACTIVE) {
          completeQuest(onlinePlayer, "siege_of_elderfall");
        }
        if (source === "outbreak" && getState(onlinePlayer, "embermarch") === STATE.ACTIVE) {
          completeQuest(onlinePlayer, "embermarch");
        }
      }
      break;
    }
    default:
      // lore:quest_accepted, lore:raid_warning, lore:wanderer_arrived, etc.
      // are outbound notifications — deliberately unhandled here.
      break;
  }
});

/* ------------------------------------------------------------------ */
/* Deaths: kill quests, captain lore beat, villager respawns           */
/* ------------------------------------------------------------------ */

world.afterEvents.entityDie.subscribe((event) => {
  const dead = event.deadEntity;
  const killer = event.damageSource?.damagingEntity;

  if (dead.typeId === "lore:raider_captain") {
    world.sendMessage("§6[Elderfall] The Raider Captain crumples — and for one heartbeat, every Corrupted in the hills stops humming.");
  }

  if (killer instanceof Player && (dead.typeId === "lore:corrupted_raider" || dead.typeId === "lore:raider_captain")) {
    recordKill(killer, dead.typeId);
  }

  if (ALL_VILLAGER_TYPES.includes(dead.typeId)) {
    // The escort caravan is a tagged copy of Orin — its loss is handled
    // (and mourned) by the escort quest, not the respawn system.
    let isCaravan = false;
    try {
      isCaravan = dead.hasTag("lore_caravan");
    } catch {
      // Tag lookup failed on a dying handle; treat as a normal villager.
    }
    if (!isCaravan) {
      const name = dead.nameTag && dead.nameTag.length > 0 ? dead.nameTag : "A villager";
      world.sendMessage(`§c[Elderfall] ${name}§c has fallen! §7Liora will have them back on their feet within the minute.`);
      addReputation(-3, "a villager fell under the Awoken's watch");
      queueRespawn(dead.typeId);
    }
  }
});

/* ------------------------------------------------------------------ */
/* Custom item powers (charm, beacon, and spell tomes)                 */
/* ------------------------------------------------------------------ */

const itemCooldowns = new Map(); // "<playerId>:<itemId>" -> tick when usable again

function onCooldown(player, itemId, seconds) {
  const key = `${player.id}:${itemId}`;
  const now = system.currentTick;
  const readyAt = itemCooldowns.get(key) ?? 0;
  if (now < readyAt) {
    actionbar(player, `§7Still gathering strength… §f${Math.ceil((readyAt - now) / 20)}s`);
    return true;
  }
  itemCooldowns.set(key, now + seconds * 20);
  return false;
}

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!(player instanceof Player)) return;
  const itemId = event.itemStack?.typeId;
  if (!itemId) return;

  // Spell tomes spend mana; handled entirely by the magic system.
  if (castSpell(player, itemId)) return;

  if (itemId === "lore:awoken_charm") {
    if (onCooldown(player, itemId, 45)) return;
    runQuiet(player, "effect @s regeneration 10 1 true");
    runQuiet(player, "effect @s resistance 10 0 true");
    runQuiet(player, "effect @s absorption 20 1 true");
    runQuiet(player, "effect @e[family=elderfall_villager,r=12] regeneration 10 1 true");
    runQuiet(player, "particle minecraft:totem_particle ~ ~1 ~");
    playSound(player, "lore.awoken_bell");
    player.sendMessage("§d[Awoken Charm] §7The charm flares warm — the memory of every kindness Elderfall has shown you, made armor.");
    return;
  }

  if (itemId === "lore:scouts_beacon") {
    if (onCooldown(player, itemId, 30)) return;
    runQuiet(player, "effect @s speed 15 1 true");
    runQuiet(player, "effect @s night_vision 30 0 true");
    playSound(player, "lore.reputation_up");
    const threats = overworld().getEntities({
      location: player.location,
      maxDistance: 48,
      families: ["corrupted"]
    });
    if (threats.length === 0) {
      player.sendMessage("§a[Scout's Beacon] §7The beacon glows steady. No Corrupted within 48 blocks.");
    } else {
      let nearest = threats[0];
      let best = Number.MAX_VALUE;
      for (const threat of threats) {
        const dx = threat.location.x - player.location.x;
        const dz = threat.location.z - player.location.z;
        const distance = dx * dx + dz * dz;
        if (distance < best) {
          best = distance;
          nearest = threat;
        }
      }
      const direction = compassDirection(player.location, nearest.location);
      player.sendMessage(
        `§c[Scout's Beacon] §7The beacon flickers violet: §f${threats.length}§7 Corrupted near — closest §f${Math.round(Math.sqrt(best))}§7 blocks to the §f${direction}§7.`
      );
    }
  }
});

/* ------------------------------------------------------------------ */
/* Heartbeats                                                          */
/* ------------------------------------------------------------------ */

// Every second: investigation-site proximity and the escort run.
system.runInterval(() => {
  checkVisitQuests();
  tickEscort();
}, 20);

// Every two seconds: raid wave progression.
system.runInterval(() => {
  tickRaid();
}, 40);

initMana();
initArmorPassives();
initVillagerLifecycle();
initOutbreaks();

// Pick a half-finished raid back up after a world reload.
system.run(() => {
  resumeRaidIfNeeded();
});

console.warn("[Elderfall] Chronicle loaded — the stones are listening.");
