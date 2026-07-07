# Elderfall Lore Mod — manually spawns the seven resident villagers.
# Normally not needed: residents spawn automatically when the village
# founds itself, and fallen villagers respawn on their own.
summon lore:mayor_aldric "Mayor Aldric Veyne" ~ ~ ~2
summon lore:blacksmith_brenna "Brenna Ironsong" ~8 ~ ~3
summon lore:historian_maelis "Maelis Vane" ~-6 ~ ~5
summon lore:scout_kestrel "Kestrel Thorn" ~2 ~ ~-9
summon lore:healer_liora "Liora Dawnpetal" ~-7 ~ ~-4
summon lore:trader_orin "Orin Fairwind" ~9 ~ ~-6
summon lore:captain_roderic "Captain Roderic Hale" ~-9 ~ ~-7
summon lore:elderfall_guardian "Elderfall Guardian" ~ ~ ~6
function elderfall/assign_dialogues
tellraw @s {"rawtext":[{"text":"§7[Elderfall] The villagers take their places. An ancient Guardian stands watch at the square."}]}
