# Elderfall Lore Mod — raid victory ceremony.
# Called by the raid system when the final wave breaks (lore:raid_victory).
playsound random.levelup @a
effect @e[family=elderfall_villager] regeneration 15 2 true
execute as @a at @s run summon fireworks_rocket ~ ~1 ~
execute as @a at @s run particle minecraft:totem_particle ~ ~2 ~
tellraw @a {"rawtext":[{"text":"§6[Elderfall] The bell tower with no bell rings a second time — and this time, it sounds like morning."}]}
