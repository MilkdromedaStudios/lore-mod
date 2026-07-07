/**
 * Elderfall Lore Mod — legendary equipment engine.
 *
 * 10 swords with on-hit abilities, 10 armor suits with worn passives,
 * and the emerald shop system the villagers sell them through.
 */
import { world, system, Player } from "@minecraft/server";
import { runQuiet, playSound, countItem, removeItem } from "./util.js";

const CORRUPTED_TYPES = ["lore:corrupted_raider", "lore:raider_captain"];

function isCorrupted(entity) {
  return CORRUPTED_TYPES.includes(entity.typeId);
}

function ignite(entity, seconds) {
  try {
    entity.setOnFire(seconds, true);
  } catch {
    runQuiet(entity, "effect @s instant_damage 1 0 true");
  }
}

/* ------------------------------------------------------------------ */
/* Swords: one unique ability each, triggered on melee hit             */
/* ------------------------------------------------------------------ */

const SWORD_ABILITIES = {
  "lore:blade_emberfang": (attacker, victim) => {
    ignite(victim, 4);
  },
  "lore:blade_frostbite": (attacker, victim) => {
    runQuiet(victim, "effect @s slowness 4 2 true");
    runQuiet(victim, "effect @s weakness 4 0 true");
  },
  "lore:blade_venomkiss": (attacker, victim) => {
    runQuiet(victim, "effect @s poison 5 1 true");
  },
  "lore:blade_soulleech": (attacker, victim) => {
    runQuiet(attacker, "effect @s regeneration 4 2 true");
    runQuiet(victim, "particle minecraft:soul_particle ~ ~1 ~");
  },
  "lore:blade_stormcall": (attacker, victim) => {
    if (Math.random() < 0.15) {
      runQuiet(victim, "summon lightning_bolt ~ ~ ~");
    }
  },
  "lore:blade_galeforce": (attacker, victim) => {
    try {
      const dx = victim.location.x - attacker.location.x;
      const dz = victim.location.z - attacker.location.z;
      const length = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
      victim.applyKnockback(dx / length, dz / length, 3.0, 0.45);
    } catch {
      runQuiet(victim, "effect @s levitation 1 1 true");
    }
  },
  "lore:blade_wardenspike": (attacker, victim) => {
    runQuiet(attacker, "effect @s resistance 3 0 true");
  },
  "lore:blade_executioner": (attacker, victim) => {
    try {
      const health = victim.getComponent("minecraft:health");
      if (health && health.currentValue <= health.effectiveMax * 0.3) {
        victim.applyDamage(4);
        runQuiet(victim, "particle minecraft:critical_hit_emitter ~ ~1 ~");
      }
    } catch {
      // No health component — nothing to execute.
    }
  },
  "lore:blade_dawnbreaker": (attacker, victim) => {
    if (isCorrupted(victim)) {
      victim.applyDamage(3);
      ignite(victim, 3);
      runQuiet(victim, "particle minecraft:totem_particle ~ ~1 ~");
    }
  },
  "lore:blade_voidrend": (attacker, victim) => {
    runQuiet(victim, "effect @s wither 4 0 true");
  },
  "lore:elderfall_defenders_blade": (attacker, victim) => {
    if (isCorrupted(victim)) {
      victim.applyDamage(3);
      runQuiet(victim, "particle minecraft:crop_growth_emitter ~ ~1 ~");
    }
  }
};

function heldItem(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    return equippable?.getEquipment("Mainhand");
  } catch {
    return undefined;
  }
}

function chestItem(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    return equippable?.getEquipment("Chest");
  } catch {
    return undefined;
  }
}

world.afterEvents.entityHurt.subscribe((event) => {
  // Guard: abilities use applyDamage (cause "none"), so they never re-trigger.
  if (event.damageSource?.cause !== "entityAttack") return;
  const attacker = event.damageSource.damagingEntity;
  if (!(attacker instanceof Player)) return;
  const ability = SWORD_ABILITIES[heldItem(attacker)?.typeId];
  if (!ability) return;
  try {
    ability(attacker, event.hurtEntity);
  } catch {
    // A dying/removed victim mid-ability is fine to ignore.
  }
});

/* ------------------------------------------------------------------ */
/* Armor suits: passive effects while worn on the chest                */
/* ------------------------------------------------------------------ */

const ARMOR_PASSIVES = {
  "lore:armor_watchmans_mail": ["effect @s absorption 6 0 true"],
  "lore:armor_emberplate": ["effect @s fire_resistance 6 0 true"],
  "lore:armor_frostguard": ["effect @s resistance 6 0 true"],
  "lore:armor_galecloak": ["effect @s speed 6 0 true"],
  "lore:armor_mosshide": ["effect @s regeneration 6 0 true"],
  "lore:armor_duskweave": ["effect @s night_vision 16 0 true"],
  "lore:armor_tidebinder": ["effect @s water_breathing 16 0 true"],
  "lore:armor_stoneheart": ["effect @s haste 6 1 true"],
  "lore:armor_skydancer": ["effect @s jump_boost 6 1 true", "effect @s slow_falling 6 0 true"]
  // lore:armor_runeplate's passive (deeper, faster mana) lives in mana.js.
};

/** True while the player wears the Runeplate of the Awoken. */
export function wearsRuneplate(player) {
  return chestItem(player)?.typeId === "lore:armor_runeplate";
}

export function initArmorPassives() {
  system.runInterval(() => {
    for (const player of world.getPlayers()) {
      const commands = ARMOR_PASSIVES[chestItem(player)?.typeId];
      if (!commands) continue;
      for (const command of commands) runQuiet(player, command);
    }
  }, 60);
}

/* ------------------------------------------------------------------ */
/* Shops: villagers and wandering traders sell equipment for emeralds  */
/* ------------------------------------------------------------------ */

export const SHOP_GOODS = {
  // Brenna's forge
  blade_emberfang: { price: 24, give: "lore:blade_emberfang", count: 1, label: "Emberfang" },
  blade_frostbite: { price: 24, give: "lore:blade_frostbite", count: 1, label: "Frostbite" },
  blade_wardenspike: { price: 28, give: "lore:blade_wardenspike", count: 1, label: "Wardenspike" },
  blade_stormcall: { price: 40, give: "lore:blade_stormcall", count: 1, label: "Stormcall" },
  // Fen Greenhollow, the wandering peddler
  armor_mosshide: { price: 20, give: "lore:armor_mosshide", count: 1, label: "Mosshide Jerkin" },
  armor_galecloak: { price: 24, give: "lore:armor_galecloak", count: 1, label: "Galecloak" },
  armor_duskweave: { price: 24, give: "lore:armor_duskweave", count: 1, label: "Duskweave Shroud" },
  armor_tidebinder: { price: 24, give: "lore:armor_tidebinder", count: 1, label: "Tidebinder Scale" },
  armor_skydancer: { price: 30, give: "lore:armor_skydancer", count: 1, label: "Skydancer Harness" },
  armor_emberplate: { price: 30, give: "lore:armor_emberplate", count: 1, label: "Emberplate" },
  arrows_bundle: { price: 4, give: "minecraft:arrow", count: 24, label: "bundle of arrows" },
  // Sella Nightlantern, the relic dealer
  blade_voidrend: { price: 48, give: "lore:blade_voidrend", count: 1, label: "Voidrend" },
  armor_runeplate: { price: 60, give: "lore:armor_runeplate", count: 1, label: "Runeplate of the Awoken" },
  tome_frostbind: { price: 30, give: "lore:tome_frostbind", count: 1, label: "Tome: Frostbind" },
  tome_skystrike: { price: 45, give: "lore:tome_skystrike", count: 1, label: "Tome: Skystrike" },
  tome_stoneskin: { price: 35, give: "lore:tome_stoneskin", count: 1, label: "Tome: Stoneskin" },
  // Maelis's archive
  tome_mending_light: { price: 30, give: "lore:tome_mending_light", count: 1, label: "Tome: Mending Light" },
  tome_windstep: { price: 25, give: "lore:tome_windstep", count: 1, label: "Tome: Windstep" }
};

export function buyGood(player, goodId) {
  const good = SHOP_GOODS[goodId];
  if (!good) {
    player.sendMessage(`§c[Elderfall] Nothing called '${goodId}' is for sale.`);
    return;
  }
  const carrying = countItem(player, "minecraft:emerald");
  if (carrying < good.price) {
    player.sendMessage(
      `§7[Elderfall] The ${good.label} costs §a${good.price} emeralds§7 — you carry §f${carrying}§7. The Corrupted drop them, and quests pay well.`
    );
    return;
  }
  removeItem(player, "minecraft:emerald", good.price);
  runQuiet(player, `give @s ${good.give} ${good.count}`);
  playSound(player, "lore.reputation_up");
  player.sendMessage(`§a[Elderfall] Purchased the §f${good.label}§a for ${good.price} emeralds. Spend it well.`);
}
