# Elderfall Lore Mod — one-time village setup.
# Run this ONCE, standing at the village square: /function elderfall/setup
# Marks the village heart (anchors quest sites + raids), spawns the six
# named villagers, and assigns their dialogue trees.
scriptevent lore:village setcenter
function elderfall/spawn_villagers
function elderfall/assign_dialogues
tellraw @s {"rawtext":[{"text":"§a[Elderfall] The village is founded. Six villagers now walk the square — speak with §6Mayor Aldric Veyne§a to begin the Chronicle."}]}
playsound random.levelup @s
