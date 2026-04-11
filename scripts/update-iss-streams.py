#!/usr/bin/env python3
"""
Fetch current ISS livestream video IDs from NASA's YouTube channel using yt-dlp.
No API key required.
"""

import re
import subprocess
import sys

CHANNEL_URL = "https://www.youtube.com/@NASA/streams"

# Patterns to match stream titles — order matches config.ts streams array
STREAM_PATTERNS = [
    {"label": "HD Views", "pattern": r"High.Definition Views from the International Space Station"},
    {"label": "Live Video", "pattern": r"Live Video from the International Space Station"},
]

CONFIG_PATH = "src/config.ts"


def get_live_streams():
    """Use yt-dlp to list videos from NASA's streams tab."""
    result = subprocess.run(
        [
            "yt-dlp",
            "--flat-playlist",
            "--print", "%(id)s\t%(title)s",
            CHANNEL_URL,
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        print(f"yt-dlp error: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    streams = []
    for line in result.stdout.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t", 1)
        if len(parts) == 2:
            streams.append({"id": parts[0], "title": parts[1]})

    return streams


def find_iss_streams(streams):
    """Match streams against known ISS stream title patterns."""
    found = []
    for pattern_info in STREAM_PATTERNS:
        matched = False
        for stream in streams:
            if re.search(pattern_info["pattern"], stream["title"], re.IGNORECASE):
                found.append({"id": stream["id"], "label": pattern_info["label"]})
                matched = True
                break
        if not matched:
            print(f"Warning: no stream found for '{pattern_info['label']}'", file=sys.stderr)

    return found


def update_config(found_streams):
    """Update the streams array in config.ts."""
    with open(CONFIG_PATH, "r") as f:
        content = f.read()

    entries = []
    for s in found_streams:
        entries.append(f"        {{ id: '{s['id']}', label: '{s['label']}' }}")

    if not entries:
        print("No ISS streams found, skipping update", file=sys.stderr)
        sys.exit(1)

    new_block = "streams: [\n" + ",\n".join(entries) + ",\n      ]"

    updated = re.sub(
        r"streams: \[.*?\]",
        new_block,
        content,
        flags=re.DOTALL,
    )

    if updated == content:
        print("No changes needed")
        return False

    with open(CONFIG_PATH, "w") as f:
        f.write(updated)

    print("Updated stream IDs:")
    for s in found_streams:
        print(f"  {s['label']}: {s['id']}")
    return True


if __name__ == "__main__":
    print("Fetching NASA streams...")
    streams = get_live_streams()
    print(f"Found {len(streams)} streams on channel")

    found = find_iss_streams(streams)
    print(f"Matched {len(found)}/{len(STREAM_PATTERNS)} ISS streams")

    update_config(found)
