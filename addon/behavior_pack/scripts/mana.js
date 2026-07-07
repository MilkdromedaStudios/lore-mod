/**
 * Elderfall Lore Mod — magic: mana pool and spell tomes.
 *
 * Every player has a mana pool (base 100), regenerating 2/second —
 * doubled to 4/second and deepened to 130 while wearing the Runeplate
 * of the Awoken. Mana is shown on the actionbar HUD. Spells are cast
 * by using tome items; each costs mana and has a short cooldown.
 */
import { world, system } from "@minecraft/server";
import { overworld, runQuiet, playSound, actionbar } from "./util.js";
import { wearsRuneplate } from "./equipment.js";

const MANA_PROP = "lore:mana";
const BASE_MAX = 100;
const RUNEPLATE_BONUS = 30;

export function maxMana(player) {
  return BASE_MAX + (wearsRuneplate(player) ? RUNEPLATE_BONUS : 0);
}

export function getMana(player) {
  const value = player.getDynamicProperty(MANA_PROP);
  return typeof value === "number" ? value : BASE_MAX;
}

function setMana(player, value) {
  player.setDynamicProperty(MANA_PROP, Math.max(0, Math.min(maxMana(player), value)));
}

/* ------------------------------------------------------------------ */
/* Spells                                                              */
/* ------------------------------------------------------------------ */

function hostilesNear(player, radius) {
  try {
    return overworld().getEntities({
      location: player.location,
      maxDistance: radius,
      families: ["monster"]
    });
  } catch {
    return [];
  }
}

const SPELLS = {
  "lore:tome_emberlash": {
    name: "Emberlash",
    cost: 20,
    cast(player) {
      const foes = hostilesNear(player, 6);
      for (const foe of foes) {
        try {
          foe.applyDamage(6);
          foe.setOnFire(4, true);
        } catch {
          runQuiet(foe, "effect @s instant_damage 1 0 true");
        }
      }
      runQuiet(player, "particle minecraft:mobflame_emitter ~ ~1 ~");
      runQuiet(player, "playsound fire.ignite @s");
      player.sendMessage(`§6[Emberlash] §7Flame roars out — §f${foes.length}§7 foes scorched.`);
    }
  },
  "lore:tome_frostbind": {
    name: "Frostbind",
    cost: 25,
    cast(player) {
      const foes = hostilesNear(player, 8);
      for (const foe of foes) {
        runQuiet(foe, "effect @s slowness 6 3 true");
        runQuiet(foe, "effect @s weakness 6 1 true");
      }
      runQuiet(player, "particle minecraft:snowflake_particle ~ ~1 ~");
      runQuiet(player, "playsound random.glass @s");
      player.sendMessage(`§b[Frostbind] §7The air cracks with rime — §f${foes.length}§7 foes bound in frost.`);
    }
  },
  "lore:tome_skystrike": {
    name: "Skystrike",
    cost: 35,
    cast(player) {
      runQuiet(player, "execute as @s at @s positioned ^ ^1 ^12 run summon lightning_bolt ~ ~ ~");
      player.sendMessage("§9[Skystrike] §7You speak the sky's name, and it answers.");
    }
  },
  "lore:tome_mending_light": {
    name: "Mending Light",
    cost: 30,
    cast(player) {
      runQuiet(player, "effect @s regeneration 6 2 true");
      runQuiet(player, "effect @s absorption 10 1 true");
      runQuiet(player, "effect @e[family=elderfall_villager,r=10] regeneration 8 1 true");
      runQuiet(player, "particle minecraft:totem_particle ~ ~1 ~");
      playSound(player, "lore.awoken_bell");
      player.sendMessage("§d[Mending Light] §7Warm light spills outward, closing wounds — yours and the village's.");
    }
  },
  "lore:tome_stoneskin": {
    name: "Stoneskin",
    cost: 25,
    cast(player) {
      runQuiet(player, "effect @s resistance 12 1 true");
      runQuiet(player, "effect @s absorption 12 1 true");
      runQuiet(player, "playsound dig.stone @s");
      player.sendMessage("§7[Stoneskin] §7Your skin remembers what the ruins are made of.");
    }
  },
  "lore:tome_windstep": {
    name: "Windstep",
    cost: 15,
    cast(player) {
      const before = player.location;
      runQuiet(player, "tp @s ^ ^1 ^7 true");
      runQuiet(player, "effect @s slow_falling 5 0 true");
      const after = player.location;
      if (Math.abs(after.x - before.x) < 0.5 && Math.abs(after.z - before.z) < 0.5) {
        // Blocked blink — refund most of the cost.
        setMana(player, getMana(player) + 10);
        actionbar(player, "§7The wind finds no path there.");
        return;
      }
      runQuiet(player, "playsound mob.enderman.portal @s");
    }
  }
};

/** Returns true if the used item was a spell tome (handled here). */
export function castSpell(player, itemTypeId) {
  const spell = SPELLS[itemTypeId];
  if (!spell) return false;
  const mana = getMana(player);
  if (mana < spell.cost) {
    actionbar(player, `§c✦ Not enough mana for ${spell.name} — ${mana}/${spell.cost}`);
    runQuiet(player, "playsound note.bass @s");
    return true;
  }
  setMana(player, mana - spell.cost);
  try {
    spell.cast(player);
  } catch {
    // A failed cast still spends the words, as Maelis would say.
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Regeneration + HUD                                                  */
/* ------------------------------------------------------------------ */

export function initMana() {
  system.runInterval(() => {
    for (const player of world.getPlayers()) {
      const max = maxMana(player);
      const regen = wearsRuneplate(player) ? 4 : 2;
      const mana = Math.min(max, getMana(player) + regen);
      setMana(player, mana);
      const bars = Math.round((mana / max) * 10);
      const meter = "§b" + "█".repeat(bars) + "§8" + "█".repeat(10 - bars);
      actionbar(player, `§b✦ Mana ${meter} §f${mana}§7/${max}`);
    }
  }, 20);
}
