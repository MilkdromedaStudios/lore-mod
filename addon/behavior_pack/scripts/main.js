/**
 * Elderfall Lore Mod — entry point.
 *
 * Wires together the origin story, dialogue-driven quest engine,
 * raid-defense loop, reputation system, and custom item powers.
 *
 * Scriptevent command surface (used by dialogue buttons and functions):
 *   lore:quest      accept <id> | turnin <id> | begin_escort | status | resetall
 *   lore:village    setcenter
 *   lore:raid       start | stop | status
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
import {
  overworld,
  eventPlayer,
  runQuiet,
  playSound,
  title,
  actionbar,
  setVillageCenter,
  compassDirection
} from "./util.js";

const VILLAGER_TYPES = [
  "lore:mayor_aldric",
  "lore:blacksmith_brenna",
  "lore:historian_maelis",
  "lore:scout_kestrel",
  "lore:healer_liora",
  "lore:trader_orin"
];

const STORY_LINES = [
  "§7You wake on cold stone with the taste of centuries in your mouth.",
  "§7Above you: a frontier village stitched into pale ruins. Elder trees grow through broken arches. Somewhere, a bell tower with no bell stands silent.",
  "§7A voice: §f\"It's true. The lanterns burned blue, and the tower rang, and now you.\"",
  "§7They call this place §6Elderfall§7. They call you the §bAwoken§7 — the protector their carvings promised when the seal beneath the shrine grew thin.",
  "§7In the hills, something that traded away its every memory is mustering the bodies of the dead.",
  "§eSpeak with §6Mayor Aldric Veyne§e to begin. §7(World owner: run §f/function elderfall/setup§7 at the village square first.)"
];

/* ------------------------------------------------------------------ */
/* Origin story on first join                                          */
/* ------------------------------------------------------------------ */

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
  if (player.getDynamicProperty("lore:welcomed") === true) return;
  player.setDynamicProperty("lore:welcomed", true);
  system.runTimeout(() => tellStory(player), 40);
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
      if (verb === "setcenter" && player) {
        setVillageCenter(player.location);
        player.sendMessage("§a[Elderfall] The village heart has been marked here. Quest sites and raids now anchor to this square.");
        playSound(player, "random.orb");
      }
      break;
    }
    case "lore:raid": {
      if (verb === "start") startRaid(player, event.sourceEntity);
      else if (verb === "stop") stopRaid(player);
      else if (verb === "status" && player) reportRaid(player);
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
    default:
      // lore:quest_accepted, lore:raid_warning, etc. are outbound
      // notifications — deliberately unhandled here.
      break;
  }
});

/* ------------------------------------------------------------------ */
/* Deaths: kill quests, captain lore beat, villager reputation loss    */
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

  if (VILLAGER_TYPES.includes(dead.typeId)) {
    const name = dead.nameTag && dead.nameTag.length > 0 ? dead.nameTag : "A villager";
    world.sendMessage(`§c[Elderfall] ${name}§c has fallen. The village grieves — and remembers.`);
    addReputation(-5, "a villager died under the Awoken's watch");
  }
});

/* ------------------------------------------------------------------ */
/* Blade bonus: ruin-iron bites deeper into the Corrupted              */
/* ------------------------------------------------------------------ */

world.afterEvents.entityHurt.subscribe((event) => {
  if (event.damageSource?.cause !== "entityAttack") return;
  const attacker = event.damageSource.damagingEntity;
  if (!(attacker instanceof Player)) return;
  const victim = event.hurtEntity;
  if (victim.typeId !== "lore:corrupted_raider" && victim.typeId !== "lore:raider_captain") return;
  try {
    const equippable = attacker.getComponent("minecraft:equippable");
    const held = equippable?.getEquipment("Mainhand");
    if (held?.typeId !== "lore:elderfall_defenders_blade") return;
    victim.applyDamage(3); // default cause "none" — cannot re-trigger this handler
    runQuiet(victim, "particle minecraft:crop_growth_emitter ~ ~1 ~");
  } catch {
    // Equipment API unavailable — the blade still cuts, just not deeper.
  }
});

/* ------------------------------------------------------------------ */
/* Custom item powers                                                  */
/* ------------------------------------------------------------------ */

const itemCooldowns = new Map(); // "<playerId>:<itemId>" -> tick when usable again

function onCooldown(player, itemId, seconds) {
  const key = `${player.id}:${itemId}`;
  const now = system.currentTick;
  const readyAt = itemCooldowns.get(key) ?? 0;
  if (now < readyAt) {
    actionbar(player, `§7The ${itemId === "lore:awoken_charm" ? "charm" : "beacon"} is still gathering strength… §f${Math.ceil((readyAt - now) / 20)}s`);
    return true;
  }
  itemCooldowns.set(key, now + seconds * 20);
  return false;
}

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  if (!(player instanceof Player)) return;
  const itemId = event.itemStack?.typeId;

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

// Every two seconds: raid wave progression, and siege-quest completion.
system.runInterval(() => {
  tickRaid();
}, 40);

// When a raid ends in victory, complete the siege quest for its holders.
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== "lore:raid_victory") return;
  for (const player of world.getPlayers()) {
    if (getState(player, "siege_of_elderfall") === STATE.ACTIVE) {
      completeQuest(player, "siege_of_elderfall");
    }
  }
});

// Pick a half-finished raid back up after a world reload.
system.run(() => {
  resumeRaidIfNeeded();
});

console.warn("[Elderfall] Chronicle loaded — the stones are listening.");
