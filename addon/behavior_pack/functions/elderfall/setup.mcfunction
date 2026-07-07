# Elderfall Lore Mod — MANUAL village setup (normally NOT needed).
# The village now founds itself automatically around the first player
# to join a fresh world. Use this only to re-anchor and rebuild the
# village somewhere else: stand at the new square and run
#   /function elderfall/setup
scriptevent lore:village setcenter
scriptevent lore:village rebuild
tellraw @s {"rawtext":[{"text":"§a[Elderfall] Re-founding the village here — walls, huts, and villagers will follow in a moment."}]}
playsound random.levelup @s
