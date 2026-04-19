"""Bulk-add items to the April session case opening."""

import time
import requests

BASE = "http://localhost:8000"

ITEMS = [
    ("FAMAS | Crypsis", "Field-Tested", 0.23),
    ("P250 | Verdigris", "Field-Tested", 0.23),
    ("StatTrak AUG | Momentum", "Field-Tested", 0.237),
    ("FAMAS | Crypsis", "Factory New", 0.06),
    ("UMP-45 | Moonrise", "Minimal Wear", 0.0814),
    ("AK-47 | Uncharted", "Battle-Scarred", 0.515),
    ("AK-47 | Uncharted", "Minimal Wear", 0.108),
    ("Galil AR | Akoben", "Minimal Wear", 0.09),
    ("FAMAS | Crypsis", "Field-Tested", 0.24),
    ("Mac-10 | Whitefish", "Battle-Scarred", 0.744),
    ("FAMAS | Crypsis", "Well-Worn", 0.383),
    ("Mac-10 | Whitefish", "Field-Tested", 0.3636),
    ("P250 | Verdigris", "Field-Tested", 0.277),
    ("FAMAS | Crypsis", "Minimal Wear", 0.12),
    ("Mac-10 | Whitefish", "Field-Tested", 0.3636),
    ("P90 | Off World", "Field-Tested", 0.227),
    ("FAMAS | Crypsis", "Field-Tested", 0.177),
    ("Mac-10 | Whitefish", "Well-Worn", 0.44),
    ("AWP | Atheris", "Minimal Wear", 0.1306),
    ("Galil AR | Akoben", "Minimal Wear", 0.09),
    ("Mac-10 | Whitefish", "Factory New", 0.039),
    ("P90 | Off World", "Well-Worn", 0.44),
    ("Mac-10 | Whitefish", "Well-Worn", 0.394),
    ("Galil AR | Akoben", "Factory New", 0.063),
    ("MAC-10 | Whitefish", "Well-Worn", 0.44),
    ("AK-47 | Uncharted", "Factory New", 0.06),
    ("AK-47 | Uncharted", "Field-Tested", 0.315),
    ("UMP-45 | Moonrise", "Field-Tested", 0.178),
    ("AK-47 | Uncharted", "Minimal Wear", 0.073),
    ("P90 | Off World", "Well-Worn", 0.44),
    ("Galil AR | Akoben", "Minimal Wear", 0.09),
    ("Five-SeveN | Angry Mob", "Field-Tested", 0.3057),
    ("MAC-10 | Whitefish", "Battle-Scarred", 0.9),
    ("Desert Eagle | Light Rail", "Field-Tested", 0.265),
    ("Galil AR | Akoben", "Field-Tested", 0.3),
    ("MP5-SD | Gauss", "Battle-Scarred", 0.83),
    ("UMP-45 | Moonrise", "Minimal Wear", 0.1),
    ("AK-47 | Uncharted", "Minimal Wear", 0.09),
    ("MP7 | Mischief", "Field-Tested", 0.185),
    ("Glock-18 | Warhawk", "Minimal Wear", 0.13),
    ("StatTrak AUG | Momentum", "Factory New", 0.0649),
    ("MP7 | Powercore", "Minimal Wear", 0.14),
    ("Tec-9 | Snek-9", "Field-Tested", 0.22),
    ("Dual Berettas | Shred", "Minimal Wear", 0.12),
]


def find_april_session() -> str:
    resp = requests.get(f"{BASE}/case-openings")
    resp.raise_for_status()
    sessions = resp.json()
    for s in sessions:
        if "april" in s["name"].lower():
            print(f"Found session: {s['name']} ({s['id']})")
            return s["id"]
    raise RuntimeError(f"No April session found. Available: {[s['name'] for s in sessions]}")


def main():
    session_id = find_april_session()
    total = len(ITEMS)
    for i, (name, wear, float_value) in enumerate(ITEMS, 1):
        payload = {"name": name, "wear": wear, "float_value": float_value}
        try:
            resp = requests.post(f"{BASE}/case-openings/{session_id}/items", json=payload)
            resp.raise_for_status()
            print(f"[{i}/{total}] Added: {name} ({wear})")
        except requests.HTTPError as e:
            print(f"[{i}/{total}] FAILED: {name} ({wear}) — {e.response.status_code} {e.response.text}")
        # Steam rate limit: 20 req/min → minimum 3s between items
        time.sleep(3)
    print("Done.")


if __name__ == "__main__":
    main()
