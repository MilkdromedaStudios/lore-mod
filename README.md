# Elderfall Lore Mod — a Minecraft Bedrock addon

> *You wake on cold stone with the taste of centuries in your mouth. Around you, a village raises itself from pale ruins — as if it had only been waiting for you to open your eyes. They call this place **Elderfall**. They call you the **Awoken**.*

A complete Bedrock addon: a frontier village that **builds itself around you at spawn**, nine named
characters with full dialogue trees, 18 quests across six quest types, **20 legendary weapons and
armor suits each with a unique ability**, a **mana-driven spell system with six tomes**, wandering
traders who walk the roads between villages, a wave-based raid, an **outbreak that storms the
village every 20th day**, and a village reputation system — all driven by Bedrock's native NPC
dialogue format plus the `@minecraft/server` scripting API.

## Installing

Grab `Elderfall_Lore_Mod.mcaddon` from the latest [build artifact](../../actions) (or build it
locally, below) and open it with Minecraft Bedrock 1.21+. Activate **both** packs on your world.

Build locally:

```bash
python tools/validate_addon.py
cd addon && zip -r ../Elderfall_Lore_Mod.zip behavior_pack resource_pack && cd ..
mv Elderfall_Lore_Mod.zip Elderfall_Lore_Mod.mcaddon
```

## Starting the Chronicle

**Just join the world.** The first player into a fresh world founds Elderfall automatically:
the plaza, well, seven huts, palisade, and watch posts build themselves around your spawn point,
the seven residents take their places, and the origin story plays. Then talk to
**Mayor Aldric Veyne** in the square.

Useful commands (cheats required for manual use): `/scriptevent lore:quest status` (quest log),
`/scriptevent lore:raid start|stop|status`, `/scriptevent lore:outbreak status`,
`/scriptevent lore:reputation query`, `/function elderfall/setup` (re-found the village elsewhere),
`/function elderfall/reset_chronicle` (wipe your progress).

## The story

Three generations ago, refugees followed a white hart into the hills and built Elderfall on
pale ruins — above the sealed tomb of the **Hollow King**, a warlord who traded every memory
he had for a crown that would never rust. The night the lanterns burned blue, you arrived:
the **Awoken**. Now the Corrupted muster in the hills, the sister villages of the hill circuit
are going silent one by one, someone is collecting the shards of the broken crown — and
**every twentieth day the seal exhales and the Corrupted march on the village.**

## The characters

| Character | Role | Quests offered |
|---|---|---|
| Mayor Aldric Veyne | Mayor | Bulwarks of Elderfall, Whispers Below, The Siege of Elderfall |
| Brenna Ironsong | Blacksmith (sword shop) | Embers of the Forge, Hold the Line |
| Maelis Vane | Historian (tome shop) | Echoes Beneath, The First Word, The Hollow Crown |
| Kestrel Thorn | Scout | Perimeter Patrol, The Last Caravan |
| Liora Dawnpetal | Healer | The Healer's Harvest |
| Orin Fairwind | Trader | Wares for the Road |
| Captain Roderic Hale | Watch captain | The Silent Village, Steel for the Watch, The Captain's Gambit, Embermarch |
| Fen Greenhollow | **Wandering peddler** (armor shop, visits every 4th day) | Ashes on the Road |
| Sella Nightlantern | **Wandering relic dealer** (relic shop, visits every 6th day) | Nightlantern's Errand |

All villagers **fight back** against the Corrupted — and if one falls, they **respawn at the
square within a minute** (at a small reputation cost). Wandering traders arrive at dawn on
their circuit days, trade until dusk, then move on to the next village.

## The quests (18)

| # | Quest | Type | Objective | Signature reward |
|---|---|---|---|---|
| 1 | Embers of the Forge | Gathering | 16 iron ingots | 10 emeralds |
| 2 | Hold the Line | Defense | Slay 10 Corrupted Raiders | Elderfall Defender's Blade |
| 3 | The Healer's Harvest | Gathering | 12 sweet berries + 4 spider eyes | Golden apples |
| 4 | Echoes Beneath | Investigation | Visit 3 ruin sites | Emeralds + books |
| 5 | Perimeter Patrol | Investigation | Walk 4 watch posts | Scout's Beacon |
| 6 | The Last Caravan | Escort | Keep Orin's caravan alive 150s | Emeralds, bow, arrows |
| 7 | Wares for the Road | Gathering | 10 leather + 5 string | Emeralds |
| 8 | Bulwarks of Elderfall | Raid preparation | 48 cobblestone + 16 planks + 8 torches | Iron chestplate |
| 9 | Whispers Below | Investigation | Find the Buried Shrine | Awoken Charm |
| 10 | The Siege of Elderfall | Raid defense | Survive all four horn-raid waves | Totem of undying |
| 11 | The First Word | Gathering (magic) | 5 lapis + 3 paper | **Tome: Emberlash** |
| 12 | Ashes on the Road | Investigation | Find the Burned Waystation | Venomkiss |
| 13 | The Silent Village | Investigation | Walk dead Havenbrook (ambush!) | Galeforce |
| 14 | Steel for the Watch | Raid preparation | 20 iron + 12 leather | Watchman's Mail |
| 15 | The Captain's Gambit | Defense | Slay 15 Corrupted Raiders | The Executioner |
| 16 | Nightlantern's Errand | Gathering | 6 bottles + 4 glowstone dust | Soulleech |
| 17 | The Hollow Crown | Investigation | 3 far crown-sites (ambush!) | Frostguard + Stoneheart |
| 18 | Embermarch | Outbreak defense | Survive a 20th-day outbreak | Dawnbreaker |

Gathering quests turn in through dialogue; kill/visit/escort/raid/outbreak quests complete
automatically. Quest state lives in per-player dynamic properties.

## Raids and the 20-day outbreak

**Horn raids** start from Mayor Aldric's dialogue: a 15-second warning, then four waves in a
ring around the village — raiders, tougher *vanguard* variants, and a boss-bar Raider Captain.
Elderfall Guardians wake to fight beside you.

**Outbreaks** need no horn: **every 20th in-game day the seal exhales** and an outbreak raid
storms the village automatically — and every outbreak you survive makes the next one one raider
stronger per wave. Ask Captain Roderic how many days remain. Raid state, outbreak count, and
the day counter all persist across world reloads.

## Legendary equipment (20) — every piece has an ability

**Ten blades** (on-hit abilities): Emberfang *(ignite)*, Frostbite *(deep slow)*, Venomkiss
*(poison)*, Soulleech *(heals you)*, Stormcall *(chance of lightning)*, Galeforce *(hurls foes)*,
Wardenspike *(grants resistance)*, The Executioner *(+4 vs wounded foes)*, Dawnbreaker *(+3 +
fire vs the Corrupted)*, Voidrend *(wither)* — plus the original Elderfall Defender's Blade.

**Ten armor suits** (worn passives): Watchman's Mail *(absorption)*, Emberplate *(fire
immunity)*, Frostguard Carapace *(resistance)*, Galecloak *(speed)*, Mosshide Jerkin
*(regeneration)*, Duskweave Shroud *(night vision)*, Tidebinder Scale *(water breathing)*,
Stoneheart Plate *(haste)*, Skydancer Harness *(jump + feather fall)*, Runeplate of the Awoken
*(+30 max mana, double regen)*.

Earned through quests or bought with emeralds from Brenna's forge, Fen's cart, and Sella's
lantern-lit stall.

## Magic: mana and the six tomes

Every player has a **mana pool (100, shown as an actionbar meter)** regenerating 2/second.
Using a spell tome casts its spell: **Emberlash** (20 — fire nova), **Frostbind** (25 — freeze
nearby foes), **Stoneskin** (25 — resistance + absorption), **Windstep** (15 — blink forward),
**Mending Light** (30 — heal yourself and nearby villagers), **Skystrike** (35 — lightning where
you look). Learn your first word through Maelis's quest *The First Word*; buy the rest from
Maelis and Sella.

## Custom events (scriptevents)

Commands the addon listens for: `lore:quest accept|turnin <id>|begin_escort|status|resetall`,
`lore:village setcenter|rebuild`, `lore:raid start|stop|status`, `lore:outbreak status|start`,
`lore:shop buy <goodId>`, `lore:reputation query|add <n>`, `lore:story tell`.

Notifications the addon fires: `lore:quest_accepted`, `lore:quest_completed`, `lore:raid_warning`,
`lore:raid_wave <n>`, `lore:raid_victory <source>`, `lore:raid_stopped`, `lore:outbreak_started
<level>`, `lore:escort_started|completed|failed`, `lore:villager_respawned <type>`,
`lore:wanderer_arrived|departed <type>`, `lore:reputation_changed <value>`.

## Repository layout

```
addon/
  behavior_pack/
    manifest.json               data + script modules, depends on the RP
    dialogue/                   9 NPC dialogue trees (with shops)
    entities/                   12 server entities (3 combat + 9 characters)
    functions/elderfall/        optional manual setup + raid ceremonies
    items/                      29 custom items (3 originals + 10 blades + 10 suits + 6 tomes)
    loot_tables/entities/       raider + captain drops
    quests/                     18 canonical quest definitions
    scripts/                    main.js + quest/raid/outbreak/mana/equipment/
                                villager-lifecycle/village-builder engine (ES modules)
    texts/
  resource_pack/
    manifest.json               resources module, depends on the BP
    animations/  entity/ (12)   models/entity/  render_controllers/
    sounds/sound_definitions.json
    textures/                   item atlas + 29 item icons + 13 entity skins
    texts/
tools/
  validate_addon.py             CI validator
  gen_textures.py               reproducible generator for every PNG
.github/workflows/build-addon.yml
```

## CI

`build-addon.yml` runs on every push to `main` (plus PRs and manual dispatch): it validates the
JSON structure and manifest UUIDs with `tools/validate_addon.py`, zips `behavior_pack/` +
`resource_pack/`, renames the archive to **`Elderfall_Lore_Mod.mcaddon`**, and uploads it as a
build artifact.
