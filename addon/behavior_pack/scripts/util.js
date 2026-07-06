/**
 * Elderfall Lore Mod — shared helpers.
 */
import { world, Player } from "@minecraft/server";

export function overworld() {
  return world.getDimension("overworld");
}

/** True if an entity handle is still usable. Works across API versions where
 *  isValid is either a method (1.x) or a property (2.x). */
export function alive(entity) {
  if (!entity) return false;
  try {
    return typeof entity.isValid === "function" ? entity.isValid() : !!entity.isValid;
  } catch {
    return false;
  }
}

/** Resolve the acting player from a scriptevent: dialogue buttons run as the
 *  NPC with the clicking player as initiator; chat/function usage runs as the
 *  player directly. */
export function eventPlayer(event) {
  if (event.initiator instanceof Player) return event.initiator;
  if (event.sourceEntity instanceof Player) return event.sourceEntity;
  return undefined;
}

/** Fire a namespaced scriptevent so other packs (and our functions) can react.
 *  These notification ids are intentionally NOT handled by our own dispatcher. */
export function notify(id, message) {
  try {
    overworld().runCommand(`scriptevent ${id} ${message}`);
  } catch {
    // Notifications are best-effort; never let them break gameplay flow.
  }
}

export function runQuiet(entity, command) {
  try {
    entity.runCommand(command);
    return true;
  } catch {
    return false;
  }
}

export function playSound(player, sound) {
  runQuiet(player, `playsound ${sound} @s`);
}

export function title(player, text, subtitle) {
  try {
    player.onScreenDisplay.setTitle(text, {
      fadeInDuration: 10,
      stayDuration: 70,
      fadeOutDuration: 20,
      subtitle: subtitle ?? ""
    });
  } catch {
    runQuiet(player, `titleraw @s title {"rawtext":[{"text":"${text}"}]}`);
  }
}

export function actionbar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {
    // Non-critical.
  }
}

/** Count how many of an item type a player carries. */
export function countItem(player, typeId) {
  const inv = player.getComponent("minecraft:inventory");
  if (!inv || !inv.container) return 0;
  const container = inv.container;
  let total = 0;
  for (let slot = 0; slot < container.size; slot++) {
    const stack = container.getItem(slot);
    if (stack && stack.typeId === typeId) total += stack.amount;
  }
  return total;
}

/** Remove up to `amount` of an item type. Returns true if fully removed. */
export function removeItem(player, typeId, amount) {
  const inv = player.getComponent("minecraft:inventory");
  if (!inv || !inv.container) return false;
  const container = inv.container;
  let remaining = amount;
  for (let slot = 0; slot < container.size && remaining > 0; slot++) {
    const stack = container.getItem(slot);
    if (!stack || stack.typeId !== typeId) continue;
    if (stack.amount > remaining) {
      stack.amount -= remaining;
      container.setItem(slot, stack);
      remaining = 0;
    } else {
      remaining -= stack.amount;
      container.setItem(slot, undefined);
    }
  }
  return remaining === 0;
}

/** Village center handling — set once via /function elderfall/setup. */
const CENTER_SET = "lore:center_set";

export function setVillageCenter(location) {
  world.setDynamicProperty(CENTER_SET, true);
  world.setDynamicProperty("lore:center_x", Math.floor(location.x));
  world.setDynamicProperty("lore:center_y", Math.floor(location.y));
  world.setDynamicProperty("lore:center_z", Math.floor(location.z));
}

export function getVillageCenter() {
  if (!world.getDynamicProperty(CENTER_SET)) return undefined;
  return {
    x: world.getDynamicProperty("lore:center_x") ?? 0,
    y: world.getDynamicProperty("lore:center_y") ?? 64,
    z: world.getDynamicProperty("lore:center_z") ?? 0
  };
}

export function horizontalDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Compass direction from `from` toward `to`, e.g. "north-east". */
export function compassDirection(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const angle = (Math.atan2(dx, -dz) * 180) / Math.PI; // 0 = north
  const names = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const index = Math.round(((angle + 360) % 360) / 45) % 8;
  return names[index];
}
