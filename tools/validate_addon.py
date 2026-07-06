#!/usr/bin/env python3
"""CI validator for the Elderfall Lore Mod addon.

Checks, in order:
  1. Required folder structure exists.
  2. Every .json file under addon/ parses as strict JSON.
  3. Both manifests are structurally sound: format_version, header,
     modules, and semver version arrays.
  4. Every manifest UUID is a valid v4-style UUID, and all UUIDs are
     unique across both packs.
  5. Pack cross-dependencies resolve (BP <-> RP header UUIDs).
  6. Dialogue files declare globally unique scene_tags.
  7. Quest files carry the required fields (id, name, description,
     steps, rewards, events).
  8. Every referenced texture path in item_texture.json and the client
     entity files exists as a .png on disk.

Exits non-zero with a readable report if anything fails.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ADDON = ROOT / "addon"
BP = ADDON / "behavior_pack"
RP = ADDON / "resource_pack"

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)

errors = []
checks = 0


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        errors.append(message)


def load_json(path):
    with open(path, encoding="utf-8-sig") as handle:
        return json.load(handle)


def main():
    # 1. Folder structure ---------------------------------------------------
    required_dirs = [
        BP, BP / "scripts", BP / "entities", BP / "items", BP / "functions",
        BP / "dialogue", BP / "quests",
        RP, RP / "textures", RP / "sounds", RP / "texts",
    ]
    for directory in required_dirs:
        check(directory.is_dir(), f"missing required directory: {directory.relative_to(ROOT)}")

    # 2. Strict JSON everywhere --------------------------------------------
    documents = {}
    for path in sorted(ADDON.rglob("*.json")):
        rel = path.relative_to(ROOT)
        try:
            documents[path] = load_json(path)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            check(False, f"invalid JSON in {rel}: {exc}")
    print(f"parsed {len(documents)} JSON files")

    # 3 + 4. Manifests and UUIDs -------------------------------------------
    seen_uuids = {}
    header_uuids = {}
    for pack_name, pack_dir in (("behavior_pack", BP), ("resource_pack", RP)):
        manifest_path = pack_dir / "manifest.json"
        check(manifest_path.is_file(), f"missing {manifest_path.relative_to(ROOT)}")
        manifest = documents.get(manifest_path)
        if manifest is None:
            continue
        check(manifest.get("format_version") == 2,
              f"{pack_name}: manifest format_version must be 2")
        header = manifest.get("header", {})
        for field in ("name", "description", "uuid", "version", "min_engine_version"):
            check(field in header, f"{pack_name}: manifest header missing '{field}'")

        def validate_uuid(value, where):
            check(isinstance(value, str) and UUID_RE.match(value or ""),
                  f"{pack_name}: {where} is not a valid UUID: {value!r}")
            if value in seen_uuids:
                check(False, f"UUID {value} reused by {where} and {seen_uuids[value]}")
            else:
                seen_uuids[value] = f"{pack_name} {where}"

        def validate_version(value, where):
            check(isinstance(value, list) and len(value) == 3
                  and all(isinstance(n, int) and n >= 0 for n in value),
                  f"{pack_name}: {where} must be [major, minor, patch] ints")

        validate_uuid(header.get("uuid"), "header.uuid")
        validate_version(header.get("version"), "header.version")
        validate_version(header.get("min_engine_version"), "header.min_engine_version")
        header_uuids[pack_name] = header.get("uuid")

        modules = manifest.get("modules", [])
        check(len(modules) >= 1, f"{pack_name}: manifest has no modules")
        for index, module in enumerate(modules):
            validate_uuid(module.get("uuid"), f"modules[{index}].uuid")
            validate_version(module.get("version"), f"modules[{index}].version")
            check(module.get("type") in ("data", "script", "resources"),
                  f"{pack_name}: modules[{index}] has unexpected type {module.get('type')!r}")
            if module.get("type") == "script":
                entry = module.get("entry", "")
                check((pack_dir / entry).is_file(),
                      f"{pack_name}: script entry '{entry}' does not exist")

    # 5. Cross-dependencies -------------------------------------------------
    bp_manifest = documents.get(BP / "manifest.json", {})
    rp_manifest = documents.get(RP / "manifest.json", {})
    bp_dep_uuids = [d.get("uuid") for d in bp_manifest.get("dependencies", []) if "uuid" in d]
    rp_dep_uuids = [d.get("uuid") for d in rp_manifest.get("dependencies", []) if "uuid" in d]
    check(header_uuids.get("resource_pack") in bp_dep_uuids,
          "behavior pack does not depend on the resource pack's header UUID")
    check(header_uuids.get("behavior_pack") in rp_dep_uuids,
          "resource pack does not depend on the behavior pack's header UUID")
    for dep in bp_manifest.get("dependencies", []):
        if "module_name" in dep:
            check(isinstance(dep.get("version"), str) and dep["version"],
                  f"module dependency {dep.get('module_name')} needs a version string")

    # 6. Dialogue scene_tags ------------------------------------------------
    scene_tags = {}
    for path in sorted((BP / "dialogue").glob("*.json")):
        doc = documents.get(path)
        if doc is None:
            continue
        scenes = doc.get("minecraft:npc_dialogue", {}).get("scenes", [])
        check(len(scenes) > 0, f"{path.name}: no dialogue scenes")
        for scene in scenes:
            tag = scene.get("scene_tag")
            check(bool(tag), f"{path.name}: scene missing scene_tag")
            check(tag not in scene_tags,
                  f"scene_tag '{tag}' duplicated in {path.name} and {scene_tags.get(tag)}")
            scene_tags[tag] = path.name
            check("text" in scene, f"{path.name}:{tag}: scene missing text")
    print(f"validated {len(scene_tags)} dialogue scenes")

    # 7. Quest files ----------------------------------------------------------
    quest_count = 0
    for path in sorted((BP / "quests").glob("*.json")):
        doc = documents.get(path)
        if doc is None:
            continue
        quest = doc.get("lore:quest")
        check(quest is not None, f"{path.name}: missing 'lore:quest' root key")
        if quest is None:
            continue
        quest_count += 1
        for field in ("id", "name", "type", "giver", "description", "steps", "objective", "rewards", "events"):
            check(field in quest, f"{path.name}: quest missing '{field}'")
        check(isinstance(quest.get("steps"), list) and len(quest.get("steps", [])) >= 2,
              f"{path.name}: quest needs at least 2 steps")
    check(quest_count >= 8, f"expected at least 8 quests, found {quest_count}")
    print(f"validated {quest_count} quests")

    # 8. Texture references ---------------------------------------------------
    item_atlas = documents.get(RP / "textures" / "item_texture.json", {})
    for shortname, entry in item_atlas.get("texture_data", {}).items():
        texture = entry.get("textures")
        check((RP / f"{texture}.png").is_file(),
              f"item_texture.json: '{shortname}' points at missing {texture}.png")
    for path in sorted((RP / "entity").glob("*.json")):
        doc = documents.get(path)
        if doc is None:
            continue
        textures = doc.get("minecraft:client_entity", {}).get("description", {}).get("textures", {})
        for key, texture in textures.items():
            check((RP / f"{texture}.png").is_file(),
                  f"{path.name}: texture '{key}' points at missing {texture}.png")

    # Report ------------------------------------------------------------------
    print(f"\n{checks} checks run")
    if errors:
        print(f"FAILED — {len(errors)} problem(s):")
        for error in errors:
            print(f"  ✗ {error}")
        sys.exit(1)
    print("OK — addon structure, JSON, UUIDs, dialogues, quests and textures are all valid")


if __name__ == "__main__":
    main()
