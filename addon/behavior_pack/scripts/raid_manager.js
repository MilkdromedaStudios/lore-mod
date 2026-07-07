/**
 * Elderfall Lore Mod — raid-defense system.
 *
 * A raid is a scripted sequence of waves spawned in a ring around the
 * village center. Raid mobs carry the `lore_raid_mob` tag; a periodic
 * sweep detects cleared waves and advances the raid.
 *
 * Custom events fired for functions and other packs to hook:
 *   lore:raid_warning <wave-count>   — horn sounded, raid incoming
 *   lore:raid_wave <n>               — wave n has spawned
 *   lore:raid_victory elderfall      — all waves broken
 *
 * State survives world reloads through world dynamic properties.
 */
import { world, system } from "@minecraft/server";
import { addReputation } from "./reputation.js";
import { overworld, notify, runQuiet, title, getVillageCenter, setVillageCenter } from "./util.js";

const RAID_ACTIVE = "lore:raid_active";
const RAID_WAVE = "lore:raid_wave"; // -1 = warning phase, 0+ = wave index spawned
const RAID_SOURCE = "lore:raid_source"; // "horn" (mayor/manual) or "outbreak" (20-day cycle)
const RAID_LEVEL = "lore:raid_level"; // outbreak strength: extra raiders per wave
const RAID_TAG = "lore_raid_mob";
const WARNING_TICKS = 300; // 15s from horn to first wave
const BETWEEN_WAVE_TICKS = 200; // 10s breather between waves

export const WAVES = [
  {
    label: "§7Wave 1 — The Probing Dark",
    entries: [{ type: "lore:corrupted_raider", count: 4 }]
  },
  {
    label: "§7Wave 2 — The Humming Line",
    entries: [
      { type: "lore:corrupted_raider", count: 5 },
      { type: "lore:corrupted_raider<lore:spawn_vanguard>", count: 1 }
    ]
  },
  {
    label: "§7Wave 3 — Vanguard of Rust",
    entries: [
      { type: "lore:corrupted_raider", count: 5 },
      { type: "lore:corrupted_raider<lore:spawn_vanguard>", count: 3 }
    ]
  },
  {
    label: "§4Wave 4 — The Captain's Banner",
    entries: [
      { type: "lore:raider_captain", count: 1 },
      { type: "lore:corrupted_raider<lore:spawn_vanguard>", count: 2 },
      { type: "lore:corrupted_raider", count: 2 }
    ]
  }
];

let sweeping = false; // guards against double-advance while a wave timer runs

export function isRaidActive() {
  return world.getDynamicProperty(RAID_ACTIVE) === true;
}

export function startRaid(initiator, npcEntity, opts = {}) {
  if (isRaidActive()) {
    if (initiator) initiator.sendMessage("§e[Elderfall] The siege is already upon us — to the walls!");
    return;
  }
  // Center on the village if marked, else on the mayor NPC, else on the player.
  let center = getVillageCenter();
  if (!center) {
    const anchor = npcEntity ?? initiator;
    if (!anchor) return;
    setVillageCenter(anchor.location);
    center = getVillageCenter();
    world.sendMessage("§7[Elderfall] The village heart has been marked where the horn was sounded.");
  }

  world.setDynamicProperty(RAID_ACTIVE, true);
  world.setDynamicProperty(RAID_WAVE, -1);
  world.setDynamicProperty(RAID_SOURCE, opts.source ?? "horn");
  world.setDynamicProperty(RAID_LEVEL, opts.level ?? 1);
  sweeping = false;

  world.sendMessage("§4§l[Elderfall] The horn of Elderfall sounds across the hills!");
  world.sendMessage("§c[Elderfall] The Corrupted are coming. Four waves. Hold the village!");
  for (const player of world.getPlayers()) {
    title(player, "§4THE SIEGE OF ELDERFALL", "§cThe Corrupted march on the village!");
    runQuiet(player, "playsound lore.raid_horn @s");
  }
  runQuiet(overworld(), "function elderfall/raid_alarm");
  notify("lore:raid_warning", `${WAVES.length}`);
  summonGuardians(center);

  system.runTimeout(() => {
    if (isRaidActive()) spawnWave(0);
  }, WARNING_TICKS);
}

function summonGuardians(center) {
  const dimension = overworld();
  const existing = dimension.getEntities({ type: "lore:elderfall_guardian" }).length;
  for (let i = existing; i < 2; i++) {
    try {
      const guardian = dimension.spawnEntity("lore:elderfall_guardian", {
        x: center.x + (i === 0 ? 3 : -3),
        y: center.y,
        z: center.z + 2
      });
      guardian.nameTag = i === 0 ? "§bElderfall Guardian§r" : "§bElderfall Guardian§r";
    } catch {
      // Blocked spawn; the militia fights without a construct.
    }
  }
  if (existing < 2) {
    world.sendMessage("§b[Elderfall] Ancient stone grinds awake — the Elderfall Guardians answer the horn!");
  }
}

function spawnWave(index) {
  const center = getVillageCenter();
  if (!center || !isRaidActive()) return;
  world.setDynamicProperty(RAID_WAVE, index);
  const wave = WAVES[index];
  const dimension = overworld();

  world.sendMessage(`§c[Elderfall] ${wave.label}§c breaks from the treeline!`);
  for (const player of world.getPlayers()) {
    title(player, `§c${wave.label}`, `§7${index + 1} of ${WAVES.length}`);
    runQuiet(player, "playsound mob.evocation_illager.prepare_attack @s");
  }
  notify("lore:raid_wave", `${index + 1}`);

  // Outbreaks grow one raider stronger per wave for every outbreak survived.
  const level = world.getDynamicProperty(RAID_LEVEL) ?? 1;
  const bonus = Math.min(6, Math.max(0, level - 1));
  const entries = bonus > 0
    ? [...wave.entries, { type: "lore:corrupted_raider", count: bonus }]
    : wave.entries;

  for (const entry of entries) {
    for (let i = 0; i < entry.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 8;
      try {
        const mob = dimension.spawnEntity(entry.type, {
          x: center.x + Math.cos(angle) * radius,
          y: center.y,
          z: center.z + Math.sin(angle) * radius
        });
        mob.addTag(RAID_TAG);
      } catch {
        // Spawn point blocked/unloaded — the wave arrives a raider short.
      }
    }
  }
  sweeping = true;
}

/** Called every 2 seconds from main.js. */
export function tickRaid() {
  if (!isRaidActive() || !sweeping) return;
  const remaining = overworld().getEntities({ tags: [RAID_TAG] }).length;
  if (remaining > 0) return;

  sweeping = false;
  const waveIndex = world.getDynamicProperty(RAID_WAVE) ?? 0;
  if (waveIndex + 1 < WAVES.length) {
    world.sendMessage(`§a[Elderfall] Wave ${waveIndex + 1} broken! §7Reform the line — the next comes soon.`);
    for (const player of world.getPlayers()) {
      runQuiet(player, "playsound lore.reputation_up @s");
    }
    system.runTimeout(() => {
      if (isRaidActive()) spawnWave(waveIndex + 1);
    }, BETWEEN_WAVE_TICKS);
  } else {
    endRaidVictory();
  }
}

function endRaidVictory() {
  const source = world.getDynamicProperty(RAID_SOURCE) ?? "horn";
  world.setDynamicProperty(RAID_ACTIVE, false);
  world.setDynamicProperty(RAID_WAVE, 0);
  world.sendMessage("§6§l[Elderfall] VICTORY! §r§6The Captain's banner burns and the humming falls silent.");
  world.sendMessage("§e[Elderfall] The village pours into the square. Tonight, Elderfall celebrates its Awoken.");
  for (const player of world.getPlayers()) {
    title(player, "§6ELDERFALL STANDS", source === "outbreak" ? "§eThe outbreak is broken" : "§eThe siege is broken");
    runQuiet(player, "playsound lore.quest_complete @s");
  }
  runQuiet(overworld(), "function elderfall/raid_victory");
  addReputation(15, source === "outbreak" ? "the outbreak was driven back" : "the siege of Elderfall was broken");
  notify("lore:raid_victory", source);
}

/** Admin stop: clears raid state and removes remaining raid mobs. */
export function stopRaid(player) {
  if (!isRaidActive()) {
    if (player) player.sendMessage("§7[Elderfall] No siege is underway.");
    return;
  }
  world.setDynamicProperty(RAID_ACTIVE, false);
  sweeping = false;
  runQuiet(overworld(), `kill @e[tag=${RAID_TAG}]`);
  world.sendMessage("§7[Elderfall] The horn sounds the retreat — the siege has been called off.");
  notify("lore:raid_stopped", "by_command");
}

export function reportRaid(player) {
  if (!isRaidActive()) {
    player.sendMessage("§7[Elderfall] The hills are quiet. For now.");
    return;
  }
  const waveIndex = world.getDynamicProperty(RAID_WAVE) ?? -1;
  const remaining = overworld().getEntities({ tags: [RAID_TAG] }).length;
  if (waveIndex < 0) {
    player.sendMessage("§c[Elderfall] The horn has sounded — the first wave is moments away!");
  } else {
    player.sendMessage(
      `§c[Elderfall] Wave §f${waveIndex + 1}§c/§f${WAVES.length}§c — §f${remaining}§c Corrupted still stand.`
    );
  }
}

/** Resume a raid interrupted by a world reload. */
export function resumeRaidIfNeeded() {
  if (!isRaidActive()) return;
  const waveIndex = world.getDynamicProperty(RAID_WAVE) ?? -1;
  if (waveIndex < 0) {
    // Reload hit during the warning phase — restart the countdown.
    system.runTimeout(() => {
      if (isRaidActive()) spawnWave(0);
    }, WARNING_TICKS);
  } else {
    // Mid-wave: the sweep picks the fight back up from the tagged mobs.
    sweeping = true;
    world.sendMessage("§c[Elderfall] The siege rages on — back to the walls!");
  }
}
