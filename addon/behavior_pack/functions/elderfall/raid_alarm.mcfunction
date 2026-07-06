# Elderfall Lore Mod — raid warning ceremony.
# Called by the raid system when the horn sounds (lore:raid_warning).
playsound raid.horn @a
playsound mob.wolf.howl @a
effect @e[family=elderfall_villager] resistance 45 1 true
effect @e[family=guardian_construct] strength 60 0 true
tellraw @a {"rawtext":[{"text":"§c[Elderfall] Villagers bar their doors. The Guardians plant their feet. §4The Corrupted are coming."}]}
