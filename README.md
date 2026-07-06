# Elderfall Lore Mod — a Minecraft Bedrock addon

> *You wake on cold stone with the taste of centuries in your mouth. They call this place **Elderfall**. They call you the **Awoken**.*

A complete Bedrock addon: a lore-rich frontier village built on ancient ruins, six named
villagers with full dialogue trees, ten quests across five quest types, three custom items,
three custom entities, a wave-based raid-defense loop, and a village reputation system —
all driven by Bedrock's native NPC dialogue format plus the `@minecraft/server` scripting API.

## Installing

Grab `Elderfall_Lore_Mod.mcaddon` from the latest [build artifact](../../actions) (or build it
locally, below) and open it with Minecraft Bedrock 1.21+. Activate **both** packs on your world
and enable cheats (functions and scriptevents require them).

Build locally:

```bash
python tools/validate_addon.py
cd addon && zip -r ../Elderfall_Lore_Mod.zip behavior_pack resource_pack && cd ..
mv Elderfall_Lore_Mod.zip Elderfall_Lore_Mod.mcaddon
```

## Starting the Chronicle

1. Create a world with both packs and cheats enabled.
2. Stand at the spot you want to be the village square and run **`/function elderfall/setup`** —
   this marks the village heart (quest sites and raids anchor to it), spawns the six villagers,
   and binds their dialogue trees.
3. Right-click **Mayor Aldric Veyne** and begin.

Useful commands: `/scriptevent lore:quest status` (quest log), `/scriptevent lore:raid start|stop|status`,
`/scriptevent lore:reputation query`, `/function elderfall/reset_chronicle` (wipe your progress).

## The story

Three generations ago, refugees followed a white hart into the hills and built Elderfall on
pale ruins — above the sealed tomb of the **Hollow King**, a warlord who traded every memory
he had for a crown that would never rust. The night the lanterns burned blue and the bell
tower with no bell rang, you arrived: the **Awoken**, the protector the carvings promised.
Now the Corrupted — dead soldiers filled with the Hollow King's humming — muster in the hills,
and the seal beneath the buried shrine grows thin.

## The villagers

| Villager | Role | Quests offered |
|---|---|---|
| Mayor Aldric Veyne | Mayor | Bulwarks of Elderfall, Whispers Below, The Siege of Elderfall |
| Brenna Ironsong | Blacksmith | Embers of the Forge, Hold the Line |
| Maelis Vane | Historian | Echoes Beneath |
| Kestrel Thorn | Scout | Perimeter Patrol, The Last Caravan |
| Liora Dawnpetal | Healer | The Healer's Harvest |
| Orin Fairwind | Trader | Wares for the Road |

## The quests

| # | Quest | Type | Objective | Signature reward |
|---|---|---|---|---|
| 1 | Embers of the Forge | Gathering | 16 iron ingots | 10 emeralds |
| 2 | Hold the Line | Defense | Slay 10 Corrupted Raiders | **Elderfall Defender's Blade** |
| 3 | The Healer's Harvest | Gathering | 12 sweet berries + 4 spider eyes | Golden apples |
| 4 | Echoes Beneath | Investigation | Visit 3 ruin sites | Emeralds + books |
| 5 | Perimeter Patrol | Investigation | Walk 4 watch posts | **Scout's Beacon** |
| 6 | The Last Caravan | Escort | Keep Orin's caravan alive 150s vs 3 ambushes | Emeralds, bow, arrows |
| 7 | Wares for the Road | Gathering | 10 leather + 5 string | Emeralds |
| 8 | Bulwarks of Elderfall | Raid preparation | 48 cobblestone + 16 oak planks + 8 torches | Iron chestplate |
| 9 | Whispers Below | Investigation | Find the Buried Shrine | **Awoken Charm** |
| 10 | The Siege of Elderfall | Raid defense | Survive all four raid waves | Totem of undying |

Gathering quests are turned in through the giver's dialogue; kill/visit/escort/raid quests
complete automatically. Quest state lives in per-player dynamic properties.

## The raid

Sound the horn through Mayor Aldric's dialogue (or `/scriptevent lore:raid start`): after a 15-second
warning — horn, howls, and the `elderfall/raid_alarm` ceremony — four waves spawn in a ring around
the village heart, and two **Elderfall Guardians** wake to fight beside you:

1. **The Probing Dark** — 4 Corrupted Raiders
2. **The Humming Line** — 5 Raiders + 1 Vanguard (tougher, faster component-group variant)
3. **Vanguard of Rust** — 5 Raiders + 3 Vanguards
4. **The Captain's Banner** — the **Raider Captain** (boss bar) with his retinue

Victory fires the `elderfall/raid_victory` ceremony, +15 reputation, and completes The Siege of
Elderfall for anyone carrying it. Raid state persists across world reloads.

## Reputation

A world-level score of how Elderfall regards you: quests and raid victories raise it, villager
deaths on your watch cost 5 each. Ranks: **Outsider → Newcomer → Friend of Elderfall →
Shield of the Village → The Awoken.**

## Custom content

**Items** — `lore:elderfall_defenders_blade` (8 damage, bonus +3 vs the Corrupted when held),
`lore:awoken_charm` (use: regeneration/resistance/absorption for you, regeneration for nearby
villagers, 45s cooldown), `lore:scouts_beacon` (use: speed + night vision + a radar ping with the
count, distance and bearing of nearby Corrupted, 30s cooldown).

**Entities** — `lore:corrupted_raider` (with `lore:spawn_vanguard` variant event),
`lore:raider_captain`, `lore:elderfall_guardian`, plus the six villager NPCs. All use
addon-local geometry, animations, render controllers and generated textures — no fragile
references to vanilla assets.

## Custom events (scriptevents)

Commands the addon listens for: `lore:quest accept|turnin <id>`, `lore:quest begin_escort|status|resetall`,
`lore:village setcenter`, `lore:raid start|stop|status`, `lore:reputation query|add <n>`, `lore:story tell`.

Notifications the addon fires (hook them from your own packs or functions):
`lore:quest_accepted <id> <player>`, `lore:quest_completed <id> <player>`, `lore:raid_warning <waves>`,
`lore:raid_wave <n>`, `lore:raid_victory`, `lore:raid_stopped`, `lore:escort_started`,
`lore:escort_completed`, `lore:escort_failed`, `lore:reputation_changed <value>`.

## Repository layout

```
addon/
  behavior_pack/
    manifest.json               data + script modules, depends on the RP
    pack_icon.png
    dialogue/                   6 NPC dialogue trees (minecraft:npc_dialogue)
    entities/                   9 server entities (3 combat + 6 villagers)
    functions/elderfall/        setup, spawn_villagers, assign_dialogues,
                                give_starter_kit, raid_alarm, raid_victory,
                                reset_chronicle
    items/                      3 custom items
    loot_tables/entities/       raider + captain drops
    quests/                     10 canonical quest definitions (custom schema)
    scripts/                    main.js + quest/raid/reputation engine (ES modules)
    texts/                      en_US.lang, languages.json
  resource_pack/
    manifest.json               resources module, depends on the BP
    pack_icon.png
    animations/                 walk / raider-arms / guardian / look-at-target
    entity/                     9 client entities
    models/entity/              lore_humanoid (64x64) + lore_guardian (128x128) geometry
    render_controllers/         default + variant-texture controllers
    sounds/sound_definitions.json
    textures/                   item_texture.json, 3 item + 10 entity textures
    texts/                      en_US.lang, languages.json
tools/
  validate_addon.py             CI validator (structure, JSON, UUIDs, dialogues, quests, textures)
  gen_textures.py               reproducible generator for every PNG in the addon
.github/workflows/build-addon.yml
```

## CI

`build-addon.yml` runs on every push to `main` (plus PRs and manual dispatch): it validates the
JSON structure and manifest UUIDs with `tools/validate_addon.py`, zips `behavior_pack/` +
`resource_pack/`, renames the archive to **`Elderfall_Lore_Mod.mcaddon`**, and uploads it as a
build artifact.
