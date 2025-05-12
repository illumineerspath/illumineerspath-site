import os
import json

# Base directory: the folder this script is in
base_dir = os.path.dirname(os.path.abspath(__file__))

# Configuration
main_dir = base_dir
lowres_dir = os.path.join(base_dir, "lowres")
bonus_dir = os.path.join(base_dir, "bonus")
output_file = os.path.join(base_dir, "manifest.json")

# Find all high-res and low-res card numbers
high_res = {
    f[:-4] for f in os.listdir(main_dir)
    if f.endswith(".png") and f[:-4].isdigit()
}

low_res = {
    f[:-4] for f in os.listdir(lowres_dir)
    if f.endswith(".png") and f[:-4].isdigit()
}

# Combine with priority to high-res
revealed = {}
for card in sorted(high_res | low_res):
    if card in high_res:
        revealed[card] = "high"
    else:
        revealed[card] = "low"

# Bonus cards
bonus = sorted(
    f.replace("bonus_", "").replace(".png", "")
    for f in os.listdir(bonus_dir)
    if f.startswith("bonus_") and f.endswith(".png")
)

# Output manifest
manifest = {
    "revealed": revealed,
    "bonus": bonus
}

with open(output_file, "w") as f:
    json.dump(manifest, f, indent=2)

# Print summary info
print("✓ Manifest saved to", output_file)
print("Summary:")
print(f"  High-res count:   {len(high_res)}")
print(f"  Low-res count:    {len(low_res)}")
print(f"  Final revealed:   {len(revealed)}")
print(f"  Bonus cards:      {len(bonus)}")

# Print first 10 cards for spot-check
print("\nSample revealed entries:")
for k in sorted(revealed)[:10]:
    print(f"  {k}: {revealed[k]}")
