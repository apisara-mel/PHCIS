#!/usr/bin/env python3
"""Fallback illustrated doctor portraits (PIL).

Production roster uses AI-generated photorealistic PNGs in
`public/images/staff/doctors/doctor-portrait-NN.png` (25 files).
Re-run this script only if you need to regenerate the illustrated fallback set.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "images" / "staff" / "doctors"
SIZE = 512

# MIH-aligned palette — unique combo per doctor (bg_top, bg_bottom, skin, hair, coat, accent)
PALETTES = [
    ("#E2F3EB", "#CFE6F7", "#F5D0B5", "#3D2C1E", "#FFFFFF", "#007549"),
    ("#DBEAFE", "#E0E7FF", "#EBC9A8", "#1F2937", "#F8FAFC", "#1D4ED8"),
    ("#FCE7F3", "#FDF2F8", "#F0C9A0", "#4A3728", "#FFFFFF", "#BE185D"),
    ("#ECFDF5", "#D1FAE5", "#E8B896", "#2D1810", "#F9FAFB", "#047857"),
    ("#E0F2FE", "#BAE6FD", "#F2CEAA", "#374151", "#FFFFFF", "#0369A1"),
    ("#FEF3C7", "#FFEDD5", "#DDB892", "#292524", "#FFFBEB", "#C2410C"),
    ("#EDE9FE", "#DDD6FE", "#F5D5B8", "#1C1917", "#FAFAFA", "#6D28D9"),
    ("#CCFBF1", "#99F6E4", "#EAC096", "#44403C", "#FFFFFF", "#0F766E"),
    ("#F3E8FF", "#E9D5FF", "#EDCAA0", "#27272A", "#FEFEFE", "#7E22CE"),
    ("#DCFCE7", "#BBF7D0", "#EBB88E", "#3F3F46", "#FFFFFF", "#15803D"),
    ("#FEE2E2", "#FECACA", "#F0C4A0", "#18181B", "#FFF7ED", "#B91C1C"),
    ("#E2E8F0", "#CBD5E1", "#E5B895", "#0F172A", "#F8FAFC", "#334155"),
    ("#D1FAE5", "#A7F3D0", "#D4A574", "#422006", "#FFFFFF", "#059669"),
    ("#BFDBFE", "#93C5FD", "#F1C27D", "#1E3A5F", "#F0F9FF", "#2563EB"),
    ("#FDE68A", "#FCD34D", "#C68642", "#292524", "#FFFBEB", "#A16207"),
    ("#C4B5FD", "#A78BFA", "#F0B990", "#1F1147", "#FAF5FF", "#5B21B6"),
    ("#6EE7B7", "#34D399", "#E0AA69", "#14532D", "#ECFDF5", "#047857"),
    ("#FDA4AF", "#FB7185", "#F5B784", "#4C0519", "#FFF1F2", "#E11D48"),
    ("#7DD3FC", "#38BDF8", "#D4956A", "#0C4A6E", "#F0F9FF", "#0284C7"),
    ("#A3E635", "#84CC16", "#E8B48A", "#365314", "#F7FEE7", "#4D7C0F"),
    ("#F0ABFC", "#E879F9", "#EBC89A", "#701A75", "#FDF4FF", "#A21CAF"),
    ("#67E8F9", "#22D3EE", "#D4A574", "#164E63", "#ECFEFF", "#0891B2"),
    ("#FDBA74", "#FB923C", "#C98860", "#431407", "#FFF7ED", "#EA580C"),
    ("#A5B4FC", "#818CF8", "#F0C9A8", "#312E81", "#EEF2FF", "#4338CA"),
    ("#86EFAC", "#4ADE80", "#E5B895", "#14532D", "#F0FDF4", "#16A34A"),
]

FEMALE_INDICES = {3, 6, 8, 10, 13, 16, 18, 21, 23, 24}  # 0-based → พญ./ทพญ.


def lerp_color(c1: str, c2: str, t: float) -> str:
    r1, g1, b1 = int(c1[1:3], 16), int(c1[3:5], 16), int(c1[5:7], 16)
    r2, g2, b2 = int(c2[1:3], 16), int(c2[3:5], 16), int(c2[5:7], 16)
    r = int(r1 + (r2 - r1) * t)
    g = int(g1 + (g2 - g1) * t)
    b = int(b1 + (b2 - b1) * t)
    return f"#{r:02x}{g:02x}{b:02x}"


def vertical_gradient(draw: ImageDraw.ImageDraw, top: str, bottom: str) -> None:
    for y in range(SIZE):
        c = lerp_color(top, bottom, y / (SIZE - 1))
        draw.line([(0, y), (SIZE, y)], fill=c)


def draw_hair(draw, cx, cy, hair, female: bool, variant: int) -> None:
    if female:
        styles = [
            [(cx - 95, cy - 30), (cx + 95, cy - 30), (cx + 110, cy + 40), (cx - 110, cy + 40)],
            [(cx - 100, cy - 20), (cx + 100, cy - 20), (cx + 85, cy + 80), (cx - 85, cy + 80)],
            [(cx - 90, cy - 40), (cx + 90, cy - 40), (cx + 105, cy + 20), (cx - 105, cy + 20)],
        ]
        draw.polygon(styles[variant % 3], fill=hair)
        draw.ellipse([cx - 105, cy - 95, cx + 105, cy + 55], fill=hair)
    else:
        draw.ellipse([cx - 105, cy - 90, cx + 105, cy + 30], fill=hair)
        if variant % 2 == 0:
            draw.rectangle([cx - 105, cy - 20, cx - 55, cy + 35], fill=hair)
            draw.rectangle([cx + 55, cy - 20, cx + 105, cy + 35], fill=hair)
        else:
            draw.polygon(
                [(cx - 100, cy - 10), (cx - 70, cy + 45), (cx - 95, cy + 20)],
                fill=hair,
            )
            draw.polygon(
                [(cx + 100, cy - 10), (cx + 70, cy + 45), (cx + 95, cy + 20)],
                fill=hair,
            )


def draw_portrait(index: int) -> None:
    bg_top, bg_bottom, skin, hair, coat, accent = PALETTES[index]
    female = index in FEMALE_INDICES
    variant = index % 5

    img = Image.new("RGB", (SIZE, SIZE), bg_top)
    draw = ImageDraw.Draw(img)
    vertical_gradient(draw, bg_top, bg_bottom)

    cx, cy = SIZE // 2, SIZE // 2 - 10

    # White coat / shoulders
    draw.polygon(
        [
            (cx - 170, SIZE),
            (cx - 120, cy + 120),
            (cx - 70, cy + 70),
            (cx + 70, cy + 70),
            (cx + 120, cy + 120),
            (cx + 170, SIZE),
        ],
        fill=coat,
    )
    draw.line([(cx, cy + 70), (cx, SIZE - 20)], fill=accent, width=4)
    draw.ellipse([cx - 18, cy + 95, cx + 18, cy + 131], fill=accent)

    # Stethoscope hint
    draw.arc([cx - 55, cy + 78, cx + 55, cy + 155], start=200, end=340, fill=accent, width=5)

    # Neck + face
    draw.rectangle([cx - 35, cy + 35, cx + 35, cy + 85], fill=skin)
    draw.ellipse([cx - 78, cy - 35, cx + 78, cy + 95], fill=skin)

    # Hair (behind face edges)
    draw_hair(draw, cx, cy - 15, hair, female, variant)

    # Eyes
    eye_y = cy + 10
    for ex in (cx - 32, cx + 32):
        draw.ellipse([ex - 14, eye_y - 10, ex + 14, eye_y + 10], fill="#FFFFFF")
        draw.ellipse([ex - 7, eye_y - 7, ex + 7, eye_y + 7], fill="#2D3748")
        draw.ellipse([ex - 2, eye_y - 4, ex + 2, eye_y], fill="#FFFFFF")

    # Brows
    draw.line([(cx - 50, cy - 5), (cx - 18, cy - 8)], fill=hair, width=4)
    draw.line([(cx + 18, cy - 8), (cx + 50, cy - 5)], fill=hair, width=4)

    # Nose + smile
    draw.line([(cx, cy + 18), (cx, cy + 38)], fill=lerp_color(skin, "#000000", 0.15), width=3)
    draw.arc([cx - 28, cy + 28, cx + 28, cy + 58], start=200, end=340, fill=lerp_color(skin, "#000000", 0.2), width=3)

    # Subtle vignette ring (avatar boundary)
    draw.ellipse([8, 8, SIZE - 8, SIZE - 8], outline=lerp_color(accent, "#FFFFFF", 0.5), width=3)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"doctor-portrait-{index + 1:02d}.png"
    img.save(out_path, format="PNG", optimize=True)
    print(f"Wrote {out_path.relative_to(ROOT)}")


def main() -> None:
    for i in range(25):
        draw_portrait(i)
    print(f"Done — {25} doctor portraits in {OUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
