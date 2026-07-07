/**
 * Elderfall Lore Mod — quest registry.
 *
 * This module is the runtime mirror of the canonical quest definitions in
 * behavior_pack/quests/*.json. Bedrock scripts cannot read data files at
 * runtime, so the same data is declared here for the quest engine.
 * If you edit a quest, update BOTH this file and its JSON definition.
 */

export const QUESTS = {
  embers_of_the_forge: {
    id: "embers_of_the_forge",
    name: "Embers of the Forge",
    type: "gathering",
    giver: "Brenna Ironsong",
    prerequisites: [],
    objective: {
      kind: "gather",
      items: [{ id: "minecraft:iron_ingot", count: 16 }]
    },
    rewards: {
      items: [{ id: "minecraft:emerald", count: 10 }],
      xpLevels: 2,
      reputation: 5
    },
    acceptText: "§6[Embers of the Forge]§r Brenna needs §f16 iron ingots§r to relight the forge. Bring them back to her when you have them.",
    completeText: "§6[Embers of the Forge]§r The forge roars to life. Iron pulled from this soil sings on the anvil once more."
  },

  hold_the_line: {
    id: "hold_the_line",
    name: "Hold the Line",
    type: "defense",
    giver: "Brenna Ironsong",
    prerequisites: ["embers_of_the_forge"],
    objective: {
      kind: "kill",
      targets: ["lore:corrupted_raider"],
      count: 10
    },
    rewards: {
      items: [{ id: "lore:elderfall_defenders_blade", count: 1 }],
      xpLevels: 3,
      reputation: 10
    },
    acceptText: "§6[Hold the Line]§r Prove the Corrupted can bleed. Slay §f10 Corrupted Raiders§r in the hills around Elderfall.",
    completeText: "§6[Hold the Line]§r Ten of the Corrupted lie still. Brenna presses the Elderfall Defender's Blade into your hands: 'It sang when I quenched it. First time in years.'"
  },

  healers_harvest: {
    id: "healers_harvest",
    name: "The Healer's Harvest",
    type: "gathering",
    giver: "Liora Dawnpetal",
    prerequisites: [],
    objective: {
      kind: "gather",
      items: [
        { id: "minecraft:sweet_berries", count: 12 },
        { id: "minecraft:spider_eye", count: 4 }
      ]
    },
    rewards: {
      items: [
        { id: "minecraft:golden_apple", count: 2 },
        { id: "minecraft:emerald", count: 6 }
      ],
      xpLevels: 2,
      reputation: 5
    },
    acceptText: "§6[The Healer's Harvest]§r Liora needs §f12 sweet berries§r and §f4 spider eyes§r to restock the infirmary before the siege.",
    completeText: "§6[The Healer's Harvest]§r Liora's shelves are full again. 'Every fighter you keep standing will have these salves to thank as much as your sword.'"
  },

  echoes_beneath: {
    id: "echoes_beneath",
    name: "Echoes Beneath",
    type: "investigation",
    giver: "Maelis Vane",
    prerequisites: [],
    objective: {
      kind: "visit",
      radius: 8,
      sites: [
        { label: "Sunken Archway", dx: 35, dz: -28 },
        { label: "Shattered Bell Tower", dx: -42, dz: 18 },
        { label: "Moss-bound Obelisk", dx: 12, dz: 47 }
      ]
    },
    rewards: {
      items: [
        { id: "minecraft:emerald", count: 8 },
        { id: "minecraft:book", count: 3 }
      ],
      xpLevels: 3,
      reputation: 8
    },
    acceptText: "§6[Echoes Beneath]§r Stand before the §fSunken Archway§r, the §fShattered Bell Tower§r, and the §fMoss-bound Obelisk§r — and listen.",
    completeText: "§6[Echoes Beneath]§r At the final stone, the humming stops — as if something drew breath. Maelis will want your account word for word."
  },

  perimeter_patrol: {
    id: "perimeter_patrol",
    name: "Perimeter Patrol",
    type: "investigation",
    giver: "Kestrel Thorn",
    prerequisites: [],
    objective: {
      kind: "visit",
      radius: 6,
      sites: [
        { label: "North Watch Post", dx: 0, dz: -24 },
        { label: "East Watch Post", dx: 24, dz: 0 },
        { label: "South Watch Post", dx: 0, dz: 24 },
        { label: "West Watch Post", dx: -24, dz: 0 }
      ]
    },
    rewards: {
      items: [{ id: "lore:scouts_beacon", count: 1 }],
      xpLevels: 2,
      reputation: 5
    },
    acceptText: "§6[Perimeter Patrol]§r Walk the circuit: the §fNorth§r, §fEast§r, §fSouth§r and §fWest§r watch posts around the village.",
    completeText: "§6[Perimeter Patrol]§r Circuit complete — the markers hold. Kestrel tosses you the Scout's Beacon: 'It's pulled me out of the dark more times than I can count.'"
  },

  the_last_caravan: {
    id: "the_last_caravan",
    name: "The Last Caravan",
    type: "escort",
    giver: "Kestrel Thorn",
    prerequisites: [],
    objective: {
      kind: "escort",
      durationSeconds: 150,
      ambushes: 3,
      escortEntity: "lore:trader_orin"
    },
    rewards: {
      items: [
        { id: "minecraft:emerald", count: 12 },
        { id: "minecraft:arrow", count: 32 },
        { id: "minecraft:bow", count: 1 }
      ],
      xpLevels: 4,
      reputation: 10
    },
    acceptText: "§6[The Last Caravan]§r Orin's final supply run must get through. Tell Kestrel to §fsignal the caravan§r when your blade is loose in its sheath.",
    completeText: "§6[The Last Caravan]§r The caravan rolls through the gates, arrows in its planks but not a scratch on Orin. Elderfall's larders will hold."
  },

  wares_for_the_road: {
    id: "wares_for_the_road",
    name: "Wares for the Road",
    type: "gathering",
    giver: "Orin Fairwind",
    prerequisites: [],
    objective: {
      kind: "gather",
      items: [
        { id: "minecraft:leather", count: 10 },
        { id: "minecraft:string", count: 5 }
      ]
    },
    rewards: {
      items: [{ id: "minecraft:emerald", count: 8 }],
      xpLevels: 2,
      reputation: 4
    },
    acceptText: "§6[Wares for the Road]§r Orin lost half his stock with his second wagon. Replace §f10 leather§r and §f5 string§r.",
    completeText: "§6[Wares for the Road]§r Orin counts out your emeralds twice — in your favor, both times. 'Fairwinds pay their debts, friend.'"
  },

  bulwarks_of_elderfall: {
    id: "bulwarks_of_elderfall",
    name: "Bulwarks of Elderfall",
    type: "raid_preparation",
    giver: "Mayor Aldric Veyne",
    prerequisites: [],
    objective: {
      kind: "gather",
      items: [
        { id: "minecraft:cobblestone", count: 48 },
        { id: "minecraft:oak_planks", count: 16 },
        { id: "minecraft:torch", count: 8 }
      ]
    },
    rewards: {
      items: [
        { id: "minecraft:emerald", count: 16 },
        { id: "minecraft:iron_chestplate", count: 1 }
      ],
      xpLevels: 3,
      reputation: 8
    },
    acceptText: "§6[Bulwarks of Elderfall]§r The palisade is rotten. Deliver §f48 cobblestone§r, §f16 oak planks§r and §f8 torches§r to Mayor Aldric.",
    completeText: "§6[Bulwarks of Elderfall]§r By dusk, new stone caps the walls and torchlight rings the village. Elderfall stands ready."
  },

  whispers_below: {
    id: "whispers_below",
    name: "Whispers Below",
    type: "investigation",
    giver: "Mayor Aldric Veyne",
    prerequisites: [],
    objective: {
      kind: "visit",
      radius: 8,
      sites: [{ label: "Buried Shrine", dx: -60, dz: -45 }]
    },
    rewards: {
      items: [{ id: "lore:awoken_charm", count: 1 }],
      xpLevels: 4,
      reputation: 10
    },
    acceptText: "§6[Whispers Below]§r Southwest of the village lies the Buried Shrine — the closed eye the founders built around. Find it. Stand upon it. Listen.",
    completeText: "§6[Whispers Below]§r The whispers fall silent the moment you touch the shrine stone — and the Awoken Charm grows warm in your pack. The seal knows its keeper."
  },

  siege_of_elderfall: {
    id: "siege_of_elderfall",
    name: "The Siege of Elderfall",
    type: "raid_defense",
    giver: "Mayor Aldric Veyne",
    prerequisites: ["hold_the_line", "bulwarks_of_elderfall"],
    objective: { kind: "raid" },
    rewards: {
      items: [
        { id: "minecraft:totem_of_undying", count: 1 },
        { id: "minecraft:emerald", count: 24 }
      ],
      xpLevels: 8,
      reputation: 25
    },
    acceptText: "§6[The Siege of Elderfall]§r The horn waits in Aldric's hall. Sound it when you are ready — and break the Hollow King's warband, captain and all.",
    completeText: "§6[The Siege of Elderfall]§r The banner falls. The humming stops. Elderfall stands — and the village knows, now, that the old stones told the truth."
  },

  the_first_word: {
    id: "the_first_word",
    name: "The First Word",
    type: "gathering",
    giver: "Maelis Vane",
    prerequisites: ["echoes_beneath"],
    objective: {
      kind: "gather",
      items: [
        { id: "minecraft:lapis_lazuli", count: 5 },
        { id: "minecraft:paper", count: 3 }
      ]
    },
    rewards: {
      items: [{ id: "lore:tome_emberlash", count: 1 }],
      xpLevels: 3,
      reputation: 8
    },
    acceptText: "§6[The First Word]§r Maelis can bind the glyph you heard at the ruins into a tome — bring her §f5 lapis lazuli§r and §f3 paper§r, and learn your first word of the old tongue.",
    completeText: "§6[The First Word]§r Maelis presses the Tome of Emberlash into your hands. 'Speak it OUTWARD, please. My archive is flammable.' Your mana now answers when you call."
  },

  ashes_on_the_road: {
    id: "ashes_on_the_road",
    name: "Ashes on the Road",
    type: "investigation",
    giver: "Fen Greenhollow",
    prerequisites: [],
    objective: {
      kind: "visit",
      radius: 10,
      sites: [{ label: "Burned Waystation", dx: 80, dz: 30 }]
    },
    rewards: {
      items: [
        { id: "lore:blade_venomkiss", count: 1 },
        { id: "minecraft:emerald", count: 6 }
      ],
      xpLevels: 3,
      reputation: 6
    },
    acceptText: "§6[Ashes on the Road]§r Fen's waystation on the east road stopped answering. Find what's left of it — and find out why the roads between the villages are going quiet.",
    completeText: "§6[Ashes on the Road]§r Charred timbers, no bodies, and hoof-prints that walk in perfect unison. Fen goes pale at your report — and gives you the blade he kept under the cart seat."
  },

  the_silent_village: {
    id: "the_silent_village",
    name: "The Silent Village",
    type: "investigation",
    giver: "Captain Roderic Hale",
    prerequisites: [],
    objective: {
      kind: "visit",
      radius: 10,
      sites: [
        { label: "Havenbrook Gate", dx: -110, dz: 60 },
        { label: "Havenbrook Well", dx: -122, dz: 74, ambush: 4 }
      ]
    },
    rewards: {
      items: [{ id: "lore:blade_galeforce", count: 1 }],
      xpLevels: 4,
      reputation: 10
    },
    acceptText: "§6[The Silent Village]§r Havenbrook, Elderfall's sister village to the southwest, has sent no trader in a month. Walk its gate and its well, and learn what silence means. §cGo armed.§r",
    completeText: "§6[The Silent Village]§r Havenbrook stands empty — doors open, tables set, and the Corrupted wearing its militia's coats. Roderic reads your report twice, then gives you Galeforce. 'We will NOT be Havenbrook.'"
  },

  steel_for_the_watch: {
    id: "steel_for_the_watch",
    name: "Steel for the Watch",
    type: "raid_preparation",
    giver: "Captain Roderic Hale",
    prerequisites: [],
    objective: {
      kind: "gather",
      items: [
        { id: "minecraft:iron_ingot", count: 20 },
        { id: "minecraft:leather", count: 12 }
      ]
    },
    rewards: {
      items: [
        { id: "lore:armor_watchmans_mail", count: 1 },
        { id: "minecraft:emerald", count: 10 }
      ],
      xpLevels: 3,
      reputation: 8
    },
    acceptText: "§6[Steel for the Watch]§r Roderic's militia drills with pitchforks. Bring §f20 iron ingots§r and §f12 leather§r so Brenna can armor the watch before the twentieth day comes.",
    completeText: "§6[Steel for the Watch]§r The watch stands in fresh mail, and the first suit off the racks is yours. 'You bleed for this village,' Roderic says, 'the least it can do is slow the blade.'"
  },

  the_captains_gambit: {
    id: "the_captains_gambit",
    name: "The Captain's Gambit",
    type: "defense",
    giver: "Captain Roderic Hale",
    prerequisites: ["steel_for_the_watch"],
    objective: {
      kind: "kill",
      targets: ["lore:corrupted_raider"],
      count: 15
    },
    rewards: {
      items: [{ id: "lore:blade_executioner", count: 1 }],
      xpLevels: 5,
      reputation: 12
    },
    acceptText: "§6[The Captain's Gambit]§r Roderic wants the Corrupted bled BEFORE the next outbreak, not during. Thin their muster: §f15 Corrupted Raiders§r.",
    completeText: "§6[The Captain's Gambit]§r Fifteen fewer hummers in the hills. Roderic unwraps an oiled bundle: The Executioner. 'Took this off a warlord once. It ends fights. See that it ends theirs.'"
  },

  nightlanterns_errand: {
    id: "nightlanterns_errand",
    name: "Nightlantern's Errand",
    type: "gathering",
    giver: "Sella Nightlantern",
    prerequisites: [],
    objective: {
      kind: "gather",
      items: [
        { id: "minecraft:glass_bottle", count: 6 },
        { id: "minecraft:glowstone_dust", count: 4 }
      ]
    },
    rewards: {
      items: [{ id: "lore:blade_soulleech", count: 1 }],
      xpLevels: 3,
      reputation: 6
    },
    acceptText: "§6[Nightlantern's Errand]§r Sella's lantern burns something rarer than oil. Bring her §f6 glass bottles§r and §f4 glowstone dust§r and she'll part with a relic she swears she won regrettably.",
    completeText: "§6[Nightlantern's Errand]§r Sella decants pale light into her lantern and slides Soulleech across the cart. 'It has a thirst. Better it drinks for Elderfall than against it.'"
  },

  the_hollow_crown: {
    id: "the_hollow_crown",
    name: "The Hollow Crown",
    type: "investigation",
    giver: "Maelis Vane",
    prerequisites: ["whispers_below"],
    objective: {
      kind: "visit",
      radius: 10,
      sites: [
        { label: "Crownfall Barrow", dx: -35, dz: -90 },
        { label: "The Kneeling Kings", dx: 60, dz: -75 },
        { label: "Sealed Deep-Gate", dx: 95, dz: 40, ambush: 3 }
      ]
    },
    rewards: {
      items: [
        { id: "lore:armor_frostguard", count: 1 },
        { id: "lore:armor_stoneheart", count: 1 }
      ],
      xpLevels: 6,
      reputation: 15
    },
    acceptText: "§6[The Hollow Crown]§r The rewritten glyphs name three far places: the Crownfall Barrow, the Kneeling Kings, and the Sealed Deep-Gate. Maelis believes the Hollow King's crown was broken into three — and buried where it fell.",
    completeText: "§6[The Hollow Crown]§r Three sites, three empty settings where crown-shards once lay. Someone — someTHING — has been collecting. Maelis arms you from the archive's deepest chest and starts writing everything down twice."
  },

  embermarch: {
    id: "embermarch",
    name: "Embermarch",
    type: "raid_defense",
    giver: "Captain Roderic Hale",
    prerequisites: ["the_captains_gambit"],
    objective: { kind: "outbreak" },
    rewards: {
      items: [
        { id: "lore:blade_dawnbreaker", count: 1 },
        { id: "minecraft:emerald", count: 20 }
      ],
      xpLevels: 8,
      reputation: 20
    },
    acceptText: "§6[Embermarch]§r Every twentieth day, the seal exhales and the Corrupted march. Roderic asks one thing: be standing in the square when the next outbreak breaks — and still standing when it's done.",
    completeText: "§6[Embermarch]§r The outbreak breaks against Elderfall like a wave on stone. At dawn Roderic hands you Dawnbreaker, hilt-first. 'The watch has a saying now: the twentieth day belongs to the Awoken.'"
  }
};

/** Quest ids in canonical display order. */
export const QUEST_ORDER = [
  "embers_of_the_forge",
  "hold_the_line",
  "healers_harvest",
  "echoes_beneath",
  "perimeter_patrol",
  "the_last_caravan",
  "wares_for_the_road",
  "bulwarks_of_elderfall",
  "whispers_below",
  "siege_of_elderfall",
  "the_first_word",
  "ashes_on_the_road",
  "the_silent_village",
  "steel_for_the_watch",
  "the_captains_gambit",
  "nightlanterns_errand",
  "the_hollow_crown",
  "embermarch"
];
