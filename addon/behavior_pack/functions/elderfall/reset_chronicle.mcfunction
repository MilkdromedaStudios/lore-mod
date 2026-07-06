# Elderfall Lore Mod — debug/admin: wipe YOUR quest progress and stop any raid.
# Run as the player to reset: /function elderfall/reset_chronicle
scriptevent lore:quest resetall
scriptevent lore:raid stop
tellraw @s {"rawtext":[{"text":"§7[Elderfall] The chronicle is blank again. The stones wait to be re-read."}]}
