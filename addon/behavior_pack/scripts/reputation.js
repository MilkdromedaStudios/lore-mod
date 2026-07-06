/**
 * Elderfall Lore Mod — village reputation system.
 *
 * Reputation is a single world-level score: how Elderfall as a community
 * regards the Awoken. It rises with completed quests and raid victories,
 * and falls when villagers die on your watch.
 */
import { world } from "@minecraft/server";
import { notify } from "./util.js";

const REP_PROP = "lore:reputation";

export const RANKS = [
  { min: 70, name: "§dThe Awoken§r", line: "They no longer doubt the old stones. Children are named after you." },
  { min: 40, name: "§bShield of the Village§r", line: "Doors open before you knock. The watch salutes when you pass." },
  { min: 20, name: "§aFriend of Elderfall§r", line: "There is always a place set for you at the long table." },
  { min: 0, name: "§eNewcomer§r", line: "They watch you with hope, and hedge it with caution." },
  { min: -9999, name: "§cOutsider§r", line: "Shutters close as you approach. Trust, once spent, is slow to mint." }
];

export function getReputation() {
  const value = world.getDynamicProperty(REP_PROP);
  return typeof value === "number" ? value : 0;
}

export function getRank(value) {
  const v = value ?? getReputation();
  for (const rank of RANKS) {
    if (v >= rank.min) return rank;
  }
  return RANKS[RANKS.length - 1];
}

export function addReputation(amount, reason) {
  const value = getReputation() + amount;
  world.setDynamicProperty(REP_PROP, value);
  const rank = getRank(value);
  const delta = amount >= 0 ? `§a+${amount}` : `§c${amount}`;
  world.sendMessage(
    `§7[Elderfall] ${delta}§7 village reputation${reason ? ` — ${reason}` : ""} §8(${value}, ${rank.name}§8)`
  );
  notify("lore:reputation_changed", `${value}`);
  return value;
}

export function reportReputation(player) {
  const value = getReputation();
  const rank = getRank(value);
  player.sendMessage(`§7[Elderfall] The village holds you at §f${value}§7 reputation: ${rank.name}`);
  player.sendMessage(`§8${rank.line}`);
}
