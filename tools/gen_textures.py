#!/usr/bin/env python3
"""Generate all PNG textures for the Elderfall Lore Mod.

Pure-python PNG writer (RGBA, 8-bit) — no external dependencies.
Entity skins are painted onto the exact UV regions declared in the
resource pack's geometry files, so every face of every cube is textured.
"""
import zlib
import struct
import random
import math
import os

ROOT = "/home/user/lore-mod/addon"
ITEMS = os.path.join(ROOT, "resource_pack", "textures", "items")
ENTITY = os.path.join(ROOT, "resource_pack", "textures", "entity")


def write_png(path, width, height, pixels):
    """pixels: dict[(x, y)] -> (r, g, b, a); missing = transparent."""
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter: none
        for x in range(width):
            raw.extend(pixels.get((x, y), (0, 0, 0, 0)))

    def chunk(tag, data):
        block = tag + data
        return struct.pack(">I", len(data)) + block + struct.pack(">I", zlib.crc32(block) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    payload = (b"\x89PNG\r\n\x1a\n"
               + chunk(b"IHDR", ihdr)
               + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
               + chunk(b"IEND", b""))
    with open(path, "wb") as handle:
        handle.write(payload)
    print("wrote", path)


def shade(color, factor):
    r, g, b, a = color
    return (max(0, min(255, int(r * factor))),
            max(0, min(255, int(g * factor))),
            max(0, min(255, int(b * factor))), a)


def fill(pixels, x0, y0, x1, y1, color, rng, jitter=0.12):
    """Fill a rect with per-pixel brightness noise so surfaces read as material."""
    for y in range(y0, y1):
        for x in range(x0, x1):
            pixels[(x, y)] = shade(color, 1.0 + rng.uniform(-jitter, jitter))


def sprinkle(pixels, x0, y0, x1, y1, color, rng, density):
    for y in range(y0, y1):
        for x in range(x0, x1):
            if rng.random() < density:
                pixels[(x, y)] = color


# ---------------------------------------------------------------- items ---

def paint_grid(grid, palette):
    pixels = {}
    for y, row in enumerate(grid):
        assert len(row) == 16, f"row {y} is {len(row)} chars"
        for x, ch in enumerate(row):
            if ch != ".":
                pixels[(x, y)] = palette[ch]
    return pixels


BLADE = [
    "..............G.",
    ".............GS.",
    "............GSb.",
    "...........SSb..",
    "..........SSb...",
    ".........SSb....",
    "........SSb.....",
    ".......SSb......",
    "..D...SSb.......",
    "...D.SSb........",
    "....DSb.........",
    "...hDD..........",
    "..hh..D.........",
    ".phh............",
    "pph.............",
    ".p..............",
]
BLADE_PALETTE = {
    "S": (216, 232, 240, 255),  # ruin-iron steel
    "b": (111, 216, 255, 255),  # singing edge glow
    "G": (240, 250, 255, 255),  # tip glint
    "D": (85, 96, 106, 255),    # crossguard
    "h": (107, 74, 42, 255),    # leather grip
    "p": (201, 162, 39, 255),   # bronze pommel
}

CHARM = [
    "................",
    "......nn........",
    ".....n..n.......",
    ".....n..n.......",
    "....GGGGGG......",
    "...GGddddGG.....",
    "..GGdmmmmdGG....",
    "..GdmmwwmmdG....",
    "..GdmwWWwmdG....",
    "..GdmmwwmmdG....",
    "..GGdmmmmdGG....",
    "...GGddddGG.....",
    "....GGGGGG......",
    "................",
    "................",
    "................",
]
CHARM_PALETTE = {
    "n": (150, 120, 60, 255),   # hanging loop
    "G": (201, 162, 39, 255),   # gold ring
    "d": (140, 110, 30, 255),   # gold shadow
    "m": (170, 80, 200, 255),   # memory-stone
    "w": (220, 150, 240, 255),  # inner light
    "W": (255, 235, 255, 255),  # core spark
}

BEACON = [
    "................",
    ".......ee.......",
    "......eYYe......",
    ".....eYWWYe.....",
    ".....eYWWYe.....",
    "......eYYe......",
    ".......ee.......",
    ".......dd.......",
    ".......hh.......",
    ".......hh.......",
    ".......hh.......",
    ".......hh.......",
    "......shhs......",
    "......shhs......",
    ".....ssssss.....",
    "................",
]
BEACON_PALETTE = {
    "e": (60, 130, 70, 255),    # verdigris frame
    "Y": (170, 240, 140, 255),  # signal glow
    "W": (240, 255, 220, 255),  # hot core
    "d": (70, 60, 45, 255),     # collar
    "h": (107, 74, 42, 255),    # haft
    "s": (85, 70, 50, 255),     # base wrap
}


def recolor_blade(steel, glow):
    """Palette-swap the sword sprite for the ten legendary blades."""
    palette = dict(BLADE_PALETTE)
    palette["S"] = steel
    palette["b"] = glow
    palette["G"] = tuple(min(255, int(c * 1.25)) for c in steel[:3]) + (255,)
    return paint_grid(BLADE, palette)


CHEST = [
    "................",
    ".ss..........ss.",
    ".sBs........sBs.",
    ".sBBssssssssBBs.",
    ".sBBBBBBBBBBBBs.",
    ".sBBBBBBBBBBBBs.",
    "..sBBBBBBBBBBs..",
    "..sBBBBTTBBBBs..",
    "..sBBBBTTBBBBs..",
    "..sBBBBBBBBBBs..",
    "..sBBBBBBBBBBs..",
    "..sBBBBBBBBBBs..",
    "..ssssssssssss..",
    "................",
    "................",
    "................",
]

TOME = [
    "................",
    "...ccccccccc....",
    "..cPPPPPPPPPc...",
    "..cPPPPPPPPPc...",
    "..cPPrrrrPPPc...",
    "..cPPrGGrPPPc...",
    "..cPPrGGrPPPc...",
    "..cPPrrrrPPPc...",
    "..cPPPPPPPPPc...",
    "..cPPPPPPPPPc...",
    "..cPPPPPPPPPc...",
    "..cPPPPPPPPPc...",
    "...ccccccccc....",
    "................",
    "................",
    "................",
]


def chest_icon(base, trim):
    shadow = shade(base, 0.6)
    return paint_grid(CHEST, {"B": base, "T": trim, "s": shadow})


def tome_icon(cover, rune):
    edge = shade(cover, 0.5)
    gem = tuple(min(255, int(c * 1.5)) for c in rune[:3]) + (255,)
    return paint_grid(TOME, {"c": edge, "P": cover, "r": rune, "G": gem})


# Ten legendary blades: (name, steel color, edge-glow color).
BLADES = [
    ("blade_emberfang", (232, 150, 60, 255), (255, 90, 20, 255)),
    ("blade_frostbite", (200, 230, 245, 255), (120, 210, 255, 255)),
    ("blade_venomkiss", (150, 200, 90, 255), (60, 160, 40, 255)),
    ("blade_soulleech", (170, 130, 200, 255), (120, 60, 180, 255)),
    ("blade_stormcall", (150, 170, 230, 255), (90, 120, 255, 255)),
    ("blade_galeforce", (235, 240, 245, 255), (190, 220, 235, 255)),
    ("blade_wardenspike", (120, 170, 170, 255), (60, 130, 130, 255)),
    ("blade_executioner", (150, 60, 60, 255), (220, 40, 40, 255)),
    ("blade_dawnbreaker", (250, 220, 130, 255), (255, 200, 60, 255)),
    ("blade_voidrend", (80, 70, 95, 255), (40, 20, 60, 255)),
]

# Ten armor suits: (name, base color, trim color).
SUITS = [
    ("armor_watchmans_mail", (140, 145, 155, 255), (140, 40, 45, 255)),
    ("armor_emberplate", (185, 95, 40, 255), (255, 180, 60, 255)),
    ("armor_frostguard", (150, 200, 230, 255), (240, 250, 255, 255)),
    ("armor_galecloak", (225, 230, 235, 255), (170, 200, 215, 255)),
    ("armor_mosshide", (95, 125, 60, 255), (60, 85, 40, 255)),
    ("armor_duskweave", (60, 55, 80, 255), (110, 100, 150, 255)),
    ("armor_tidebinder", (55, 110, 130, 255), (110, 200, 210, 255)),
    ("armor_stoneheart", (120, 120, 115, 255), (80, 80, 75, 255)),
    ("armor_skydancer", (200, 160, 220, 255), (245, 220, 255, 255)),
    ("armor_runeplate", (110, 70, 160, 255), (87, 216, 196, 255)),
]

# Six spell tomes: (name, cover color, rune color).
TOME_COLORS = [
    ("tome_emberlash", (150, 60, 30, 255), (255, 150, 50, 255)),
    ("tome_frostbind", (50, 90, 140, 255), (150, 220, 255, 255)),
    ("tome_skystrike", (60, 70, 130, 255), (150, 170, 255, 255)),
    ("tome_mending_light", (190, 160, 180, 255), (255, 220, 240, 255)),
    ("tome_stoneskin", (105, 105, 100, 255), (200, 200, 190, 255)),
    ("tome_windstep", (170, 190, 190, 255), (230, 250, 250, 255)),
]


# ------------------------------------------------- humanoid skin painter ---

# Standard 64x64 humanoid UV regions (matches geometry.lore_humanoid):
#   head   region (0,0)-(32,16),  front face (8,8)-(16,16)
#   body   region (16,16)-(40,32), front face (20,20)-(28,32)
#   rLeg   (0,16)-(16,32)   rArm (40,16)-(56,32)
#   lLeg   (16,48)-(32,64)  lArm (32,48)-(48,64)

def humanoid_skin(seed, skin, hair, torso, sleeves, legs, boots,
                  eye=(40, 32, 28, 255), eye_glow=False, trim=None):
    rng = random.Random(seed)
    px = {}
    # Head: hair/hood over everything, face on the front.
    fill(px, 0, 0, 32, 16, hair, rng)
    fill(px, 8, 8, 16, 16, skin, rng, 0.06)          # front face
    fill(px, 8, 8, 16, 10, hair, rng)                # fringe / hood brim
    for ex in (10, 13):
        px[(ex, 11)] = eye
        if eye_glow:
            px[(ex, 12)] = shade(eye, 1.4)
    for mx in range(11, 13):                          # mouth
        px[(mx, 14)] = shade(skin, 0.75)
    # Body region + front details.
    fill(px, 16, 16, 40, 32, torso, rng)
    if trim:                                          # belt / sash across the waist
        fill(px, 20, 27, 28, 29, trim, rng, 0.05)
    # Arms.
    fill(px, 40, 16, 56, 32, sleeves, rng)
    fill(px, 32, 48, 48, 64, sleeves, rng)
    fill(px, 40, 16, 56, 20, torso, rng)              # shoulders match torso
    fill(px, 32, 48, 48, 52, torso, rng)
    # Legs + boots.
    fill(px, 0, 16, 16, 32, legs, rng)
    fill(px, 16, 48, 32, 64, legs, rng)
    fill(px, 0, 28, 16, 32, boots, rng)
    fill(px, 16, 60, 32, 64, boots, rng)
    return px


def corrupted_skin(seed, base, cloth, glow):
    """Raider variant of the humanoid skin: dead flesh, ragged cloth, glowing eyes."""
    px = humanoid_skin(
        seed,
        skin=base, hair=shade(base, 0.7),
        torso=cloth, sleeves=shade(cloth, 0.85), legs=shade(cloth, 0.7),
        boots=(40, 36, 32, 255), eye=glow, eye_glow=True,
        trim=(60, 52, 44, 255),
    )
    rng = random.Random(seed + 99)
    # Corruption veins crawling over cloth and flesh.
    sprinkle(px, 16, 16, 40, 32, glow, rng, 0.045)
    sprinkle(px, 0, 0, 32, 16, shade(glow, 0.8), rng, 0.03)
    sprinkle(px, 0, 16, 16, 32, shade(glow, 0.6), rng, 0.03)
    sprinkle(px, 16, 48, 32, 64, shade(glow, 0.6), rng, 0.03)
    return px


# ------------------------------------------------------------- guardian ---

def guardian_skin():
    """128x128 skin matching geometry.lore_guardian's UV layout."""
    rng = random.Random(7)
    stone = (143, 155, 138, 255)
    moss = (74, 112, 66, 255)
    rune = (87, 216, 196, 255)
    px = {}
    regions = [
        (0, 0, 40, 20),    # head
        (0, 22, 44, 46),   # body
        (44, 0, 64, 23),   # right arm
        (68, 0, 88, 23),   # left arm
        (44, 26, 64, 45),  # right leg
        (68, 26, 88, 45),  # left leg
    ]
    for x0, y0, x1, y1 in regions:
        fill(px, x0, y0, x1, y1, stone, rng, 0.15)
        sprinkle(px, x0, y0, x1, y1, moss, rng, 0.08)
        sprinkle(px, x0, y0, x1, y1, shade(stone, 0.6), rng, 0.05)  # cracks
    # Face plate (head front face is (10,10)-(20,20)): rune-lit eyes.
    fill(px, 10, 10, 20, 20, shade(stone, 0.9), rng, 0.08)
    for ex in (12, 17):
        px[(ex, 13)] = rune
        px[(ex, 14)] = shade(rune, 1.3)
    # Chest rune spiral on the body front face (8,30)-(22,46).
    for i, (dx, dy) in enumerate([(0, 0), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (2, 0)]):
        px[(15 + dx, 37 + dy)] = shade(rune, 1.0 - i * 0.05)
    return px


# ------------------------------------------------------------ pack icons ---

def pack_icon(accent):
    """128x128: the bell tower with no bell, ringed by the old walls."""
    rng = random.Random(21)
    px = {}
    cx = cy = 64
    for y in range(128):
        for x in range(128):
            d = math.hypot(x - cx, y - cy)
            glow = max(0.0, 1.0 - d / 96.0)
            base = (18 + int(20 * glow), 22 + int(24 * glow), 30 + int(30 * glow), 255)
            px[(x, y)] = shade(base, 1.0 + rng.uniform(-0.05, 0.05))
    # Ring of pale ruin-stone.
    for angle in range(0, 3600):
        theta = math.radians(angle / 10.0)
        for radius in (46, 47, 48):
            x = int(cx + radius * math.cos(theta))
            y = int(cy + radius * math.sin(theta))
            if 0 <= x < 128 and 0 <= y < 128 and rng.random() > 0.15:
                px[(x, y)] = shade((196, 202, 188, 255), 1.0 + rng.uniform(-0.15, 0.05))
    # The tower.
    for y in range(34, 100):
        for x in range(54, 75):
            px[(x, y)] = shade((70, 76, 84, 255), 1.0 + rng.uniform(-0.12, 0.12))
    for x in range(50, 79):  # parapet
        for y in range(30, 36):
            if (x - 50) % 6 < 4:
                px[(x, y)] = shade((88, 94, 102, 255), 1.0 + rng.uniform(-0.1, 0.1))
    # The empty bell arch, lit from within by the accent color.
    for y in range(42, 58):
        for x in range(59, 70):
            arch_y = 42 + int(5 - math.sqrt(max(0, 25 - (x - 64.5) ** 2)))
            if y >= arch_y:
                px[(x, y)] = shade(accent, 0.9 + rng.uniform(-0.1, 0.2))
    # Lantern windows down the tower.
    for wy in (66, 80):
        for y in range(wy, wy + 5):
            for x in range(62, 67):
                px[(x, y)] = shade(accent, 0.7 + rng.uniform(-0.1, 0.1))
    return px


def main():
    # Items (16x16).
    write_png(os.path.join(ITEMS, "elderfall_defenders_blade.png"), 16, 16,
              paint_grid(BLADE, BLADE_PALETTE))
    write_png(os.path.join(ITEMS, "awoken_charm.png"), 16, 16,
              paint_grid(CHARM, CHARM_PALETTE))
    write_png(os.path.join(ITEMS, "scouts_beacon.png"), 16, 16,
              paint_grid(BEACON, BEACON_PALETTE))

    # Legendary equipment and spell tomes (16x16 each).
    for name, steel, glow in BLADES:
        write_png(os.path.join(ITEMS, f"{name}.png"), 16, 16, recolor_blade(steel, glow))
    for name, base, trim in SUITS:
        write_png(os.path.join(ITEMS, f"{name}.png"), 16, 16, chest_icon(base, trim))
    for name, cover, rune in TOME_COLORS:
        write_png(os.path.join(ITEMS, f"{name}.png"), 16, 16, tome_icon(cover, rune))

    # Hostiles (64x64 humanoid layout).
    write_png(os.path.join(ENTITY, "corrupted_raider.png"), 64, 64,
              corrupted_skin(11, base=(122, 134, 116, 255), cloth=(59, 74, 58, 255), glow=(123, 47, 190, 255)))
    write_png(os.path.join(ENTITY, "corrupted_raider_vanguard.png"), 64, 64,
              corrupted_skin(12, base=(110, 118, 122, 255), cloth=(52, 46, 66, 255), glow=(180, 70, 255, 255)))
    write_png(os.path.join(ENTITY, "raider_captain.png"), 64, 64,
              corrupted_skin(13, base=(100, 104, 110, 255), cloth=(42, 35, 49, 255), glow=(255, 190, 60, 255)))

    # Villagers (64x64 humanoid layout).
    write_png(os.path.join(ENTITY, "villager_mayor.png"), 64, 64, humanoid_skin(
        21, skin=(224, 180, 145, 255), hair=(200, 200, 205, 255),
        torso=(90, 63, 110, 255), sleeves=(80, 55, 100, 255),
        legs=(60, 45, 75, 255), boots=(45, 35, 30, 255), trim=(201, 162, 39, 255)))
    write_png(os.path.join(ENTITY, "villager_blacksmith.png"), 64, 64, humanoid_skin(
        22, skin=(198, 145, 110, 255), hair=(140, 60, 30, 255),
        torso=(74, 53, 39, 255), sleeves=(120, 90, 70, 255),
        legs=(70, 60, 55, 255), boots=(40, 35, 30, 255), trim=(184, 80, 30, 255)))
    write_png(os.path.join(ENTITY, "villager_historian.png"), 64, 64, humanoid_skin(
        23, skin=(216, 172, 140, 255), hair=(225, 225, 220, 255),
        torso=(46, 95, 92, 255), sleeves=(40, 82, 80, 255),
        legs=(50, 60, 62, 255), boots=(60, 50, 40, 255), trim=(232, 220, 192, 255)))
    write_png(os.path.join(ENTITY, "villager_scout.png"), 64, 64, humanoid_skin(
        24, skin=(190, 150, 118, 255), hair=(60, 90, 46, 255),
        torso=(60, 90, 46, 255), sleeves=(80, 75, 50, 255),
        legs=(70, 78, 52, 255), boots=(50, 42, 30, 255), trim=(138, 122, 77, 255)))
    write_png(os.path.join(ENTITY, "villager_healer.png"), 64, 64, humanoid_skin(
        25, skin=(230, 190, 158, 255), hair=(120, 85, 50, 255),
        torso=(232, 224, 208, 255), sleeves=(218, 208, 190, 255),
        legs=(180, 170, 155, 255), boots=(90, 70, 55, 255), trim=(194, 91, 106, 255)))
    write_png(os.path.join(ENTITY, "villager_trader.png"), 64, 64, humanoid_skin(
        26, skin=(205, 158, 122, 255), hair=(90, 65, 40, 255),
        torso=(122, 92, 48, 255), sleeves=(63, 127, 191, 255),
        legs=(85, 70, 50, 255), boots=(55, 45, 35, 255), trim=(63, 127, 191, 255)))

    write_png(os.path.join(ENTITY, "villager_captain.png"), 64, 64, humanoid_skin(
        27, skin=(200, 155, 120, 255), hair=(140, 140, 145, 255),
        torso=(90, 95, 102, 255), sleeves=(70, 75, 82, 255),
        legs=(55, 58, 64, 255), boots=(30, 30, 32, 255), trim=(140, 31, 40, 255)))
    write_png(os.path.join(ENTITY, "villager_fen.png"), 64, 64, humanoid_skin(
        28, skin=(210, 160, 125, 255), hair=(200, 170, 90, 255),
        torso=(79, 122, 58, 255), sleeves=(120, 95, 60, 255),
        legs=(90, 80, 55, 255), boots=(60, 48, 35, 255), trim=(201, 162, 39, 255)))
    write_png(os.path.join(ENTITY, "villager_sella.png"), 64, 64, humanoid_skin(
        29, skin=(228, 210, 195, 255), hair=(35, 35, 60, 255),
        torso=(40, 48, 78, 255), sleeves=(32, 38, 62, 255),
        legs=(28, 32, 50, 255), boots=(20, 22, 34, 255), trim=(87, 216, 196, 255)))

    # Guardian (128x128 custom layout).
    write_png(os.path.join(ENTITY, "elderfall_guardian.png"), 128, 128, guardian_skin())

    # Pack icons.
    write_png(os.path.join(ROOT, "behavior_pack", "pack_icon.png"), 128, 128,
              pack_icon((201, 162, 39, 255)))   # amber — the horn and the forge
    write_png(os.path.join(ROOT, "resource_pack", "pack_icon.png"), 128, 128,
              pack_icon((87, 216, 196, 255)))   # rune-cyan — the stones that listen


if __name__ == "__main__":
    main()
