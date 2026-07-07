/**
 * Elderfall Lore Mod — the Outbreak cycle.
 *
 * Every 20th day, the seal beneath the shrine exhales and the Corrupted
 * pour out of the hills: an automatic raid on the village, one wave
 * stronger for every outbreak already survived. No horn required —
 * the 20th night comes whether Elderfall is ready or not.
 */
import { world, system } from "@minecraft/server";
import { overworld, runQuiet, getVillageCenter, notify } from "./util.js";
import { startRaid, isRaidActive } from "./raid_manager.js";
import { currentDay } from "./villagers.js";

export const OUTBREAK_PERIOD_DAYS = 20;
const LAST_OUTBREAK_PROP = "lore:last_outbreak_day";
const OUTBREAK_COUNT_PROP = "lore:outbreak_count";

export function outbreaksSurvived() {
  const value = world.getDynamicProperty(OUTBREAK_COUNT_PROP);
  return typeof value === "number" ? value : 0;
}

export function recordOutbreakVictory() {
  world.setDynamicProperty(OUTBREAK_COUNT_PROP, outbreaksSurvived() + 1);
}

export function daysUntilOutbreak() {
  const day = currentDay();
  const remainder = day % OUTBREAK_PERIOD_DAYS;
  return remainder === 0 && day > 0 ? 0 : OUTBREAK_PERIOD_DAYS - remainder;
}

export function reportOutbreak(player) {
  const days = daysUntilOutbreak();
  const survived = outbreaksSurvived();
  if (isRaidActive()) {
    player.sendMessage("§4[Elderfall] The outbreak is HERE. Less talking, more fighting.");
    return;
  }
  player.sendMessage(
    days === 0
      ? "§c[Elderfall] The seal exhales TODAY. Stand ready."
      : `§7[Elderfall] The seal weakens… §f${days}§7 day(s) until the next outbreak. §8(${survived} survived so far — each one comes back stronger.)`
  );
}

function triggerOutbreak(day) {
  world.setDynamicProperty(LAST_OUTBREAK_PROP, day);
  const level = outbreaksSurvived() + 1;
  world.sendMessage("§4§l[Elderfall] The ground shudders. Far below, something exhales.");
  world.sendMessage(
    `§c[Elderfall] OUTBREAK — day ${day}. The Corrupted pour from the hills §4(strength ${level})§c. Defend the village!`
  );
  runQuiet(overworld(), "playsound mob.wither.spawn @a");
  notify("lore:outbreak_started", `${level}`);
  startRaid(undefined, undefined, { source: "outbreak", level });
}

export function initOutbreaks() {
  system.runInterval(() => {
    const center = getVillageCenter();
    if (!center || isRaidActive()) return;
    const day = currentDay();
    if (day === 0 || day % OUTBREAK_PERIOD_DAYS !== 0) return;
    if (world.getDynamicProperty(LAST_OUTBREAK_PROP) === day) return;
    triggerOutbreak(day);
  }, 200);
}
