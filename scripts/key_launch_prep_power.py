"""Chroma-key magenta studio BG from Imagine JPGs → public/ power-terminal PNGs."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SESSION = Path(
    r"C:\Users\antho\.grok\sessions\C%3A%5CUsers%5Cantho%5COrbit26\01a00cd6-1566-78a3-a2a1-7f4c3d99956e\images"
)
OUT = Path(__file__).resolve().parents[1] / "public"

# name, src, pad px after crop
JOBS = [
    ("LaunchPrepPowerToggleOff.png", "1.jpg", 10),
    ("LaunchPrepPowerCover.png", "2.jpg", 8),
    ("LaunchPrepPowerIconAvionics.png", "3.jpg", 4),
    ("LaunchPrepPowerTerminal.png", "4.jpg", 6),
    ("LaunchPrepPowerIconFlight.png", "5.jpg", 4),
    ("LaunchPrepPowerIconTelemetry.png", "6.jpg", 4),
    ("LaunchPrepPowerToggleOn.png", "7.jpg", 10),
    ("LaunchPrepPowerIconRange.png", "8.jpg", 4),
]


def sample_key(arr: np.ndarray) -> np.ndarray:
    h, w, _ = arr.shape
    patches = [
        arr[0:16, 0:16],
        arr[0:16, w - 16 : w],
        arr[h - 16 : h, 0:16],
        arr[h - 16 : h, w - 16 : w],
    ]
    return np.median(np.concatenate([p.reshape(-1, 3) for p in patches], axis=0), axis=0)


def key_image(im: Image.Image) -> Image.Image:
    arr = np.asarray(im.convert("RGB"), dtype=np.float32)
    key = sample_key(arr)
    dist = np.sqrt(((arr - key) ** 2).sum(axis=2))

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Safety-red / steel / gold / cyan subjects must not be keyed.
    # True safety-red (high R, low B) — not the magenta studio field.
    subject_red = (r > 120) & (b < 120) & (r > b + 70) & (r > g + 25)
    subject_metal = (np.abs(r - g) < 28) & (np.abs(g - b) < 28) & ((r + g + b) > 180)
    subject_gold = (r > 150) & (g > 100) & (b < 110) & (r > b + 40)
    subject_cyan = (b > 140) & (g > 110) & (r < 160) & (b > r + 20)
    protect = subject_red | subject_metal | subject_gold | subject_cyan

    # Magenta / hot-pink studio field: high R+B, low G, not a red subject.
    magenta = (~protect) & (r > 140) & (b > 90) & (g < 150) & ((r + b) > (g * 2.05 + 30))
    # Soft drop-shadows on the field: darker but still magenta-leaning.
    shadow = (
        (~protect)
        & (r < 180)
        & (g < 100)
        & (b < 170)
        & (r > g + 16)
        & (b > g + 6)
        & (r + b > 70)
    )

    kill = 38.0
    keep = 88.0
    score = np.clip(1.0 - (dist - kill) / (keep - kill), 0.0, 1.0)
    score = np.where(magenta, np.maximum(score, 0.92), score)
    score = np.where(shadow, np.maximum(score, 0.82), score)
    score = np.where(protect, score * 0.08, score)

    alpha = (1.0 - np.clip((score - 0.28) / 0.52, 0.0, 1.0)) * 255.0
    alpha = np.where(dist < kill, 0.0, alpha)
    alpha = np.where(protect, np.maximum(alpha, 230.0), alpha)
    alpha = np.where(magenta & (dist < 110), np.minimum(alpha, 18.0), alpha)
    alpha = np.where(shadow, np.minimum(alpha, 12.0), alpha)

    # Despill remaining magenta fringe toward neutral grey — never on red subjects.
    spill = np.clip((r + b - 2.0 * g - 30.0) / 180.0, 0.0, 1.0)
    spill = np.where(protect, 0.0, spill)[..., None]
    grey = ((r + g + b) / 3.0)[..., None]
    rgb = arr * (1.0 - spill * 0.85) + grey * (spill * 0.85)
    rgb = np.clip(rgb, 0, 255)

    rgba = np.dstack([rgb, alpha]).astype(np.uint8)
    rgba[alpha < 8, :] = 0
    return Image.fromarray(rgba, "RGBA")


def trim_dark_tail(im: Image.Image) -> Image.Image:
    """Drop a thin detached shadow hanging below a solid housing."""
    arr = np.asarray(im)
    alpha = arr[:, :, 3]
    lum = arr[:, :, 0:3].mean(axis=2)
    rows = np.where(alpha.max(axis=1) > 20)[0]
    if len(rows) == 0:
        return im
    widths = (alpha > 20).sum(axis=1).astype(np.float32)
    body = widths.max()
    # Walk up from the bottom; cut once a row is both dark and much narrower.
    cut = rows[-1] + 1
    for y in range(int(rows[-1]), int(rows[0]), -1):
        opaque = lum[y][alpha[y] > 20]
        if widths[y] < body * 0.55 and opaque.size and opaque.mean() < 55:
            cut = y
        else:
            break
    if cut < im.height - 4:
        return im.crop((0, 0, im.width, cut))
    return im


def crop_alpha(im: Image.Image, pad: int) -> Image.Image:
    alpha = np.asarray(im.split()[-1])
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, src, pad in JOBS:
        src_path = SESSION / src
        keyed = key_image(Image.open(src_path))
        cropped = crop_alpha(keyed, pad)
        if "Toggle" in name:
            cropped = trim_dark_tail(cropped)
            cropped = crop_alpha(cropped, 6)
        dest = OUT / name
        cropped.save(dest, "PNG")
        print(f"{name}: {cropped.size[0]}x{cropped.size[1]} from {src}")

    # Match off/on switch boxes — crop leftover shadow from the taller off plate.
    off_p = OUT / "LaunchPrepPowerToggleOff.png"
    on_p = OUT / "LaunchPrepPowerToggleOn.png"
    off_im = Image.open(off_p)
    on_im = Image.open(on_p)
    if off_im.height > on_im.height:
        off_im.crop((0, 0, off_im.width, on_im.height)).save(off_p, "PNG")
        print(f"LaunchPrepPowerToggleOff.png: cropped to {off_im.width}x{on_im.height}")


if __name__ == "__main__":
    main()
