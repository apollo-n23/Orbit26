"""One-shot: chroma-key magenta studio BG from Imagine JPGs → public/ PNGs."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SESSION = Path(
    r"C:\Users\antho\.grok\sessions\C%3A%5CUsers%5Cantho%5COrbit26\01a00c81-b415-7421-858a-7fbe171e3696\images"
)
OUT = Path(__file__).resolve().parents[1] / "public"

JOBS = [
    # name, src, mode: "hard" (lattice/props) or "soft" (clouds/glow)
    ("LaunchPrepCloudA.png", "5.jpg", "soft"),
    ("LaunchPrepCloudB.png", "2.jpg", "soft"),
    ("LaunchPrepCloudC.png", "1.jpg", "soft"),
    ("LaunchPrepStarSparkle.png", "10.jpg", "soft"),
    ("LaunchPrepCraneBoom.png", "3.jpg", "hard"),
    ("LaunchPrepCraneJib.png", "13.jpg", "hard"),
    ("LaunchPrepCraneCab.png", "15.jpg", "hard"),
    ("LaunchPrepCraneBase.png", "14.jpg", "hard"),
    ("LaunchPrepCraneHook.png", "11.jpg", "hard"),
    ("LaunchPrepFairing.png", "6.jpg", "hard"),
    ("LaunchPrepDrone.png", "9.jpg", "hard"),
    ("LaunchPrepFuelSlugLox.png", "7.jpg", "soft"),
    ("LaunchPrepFuelSlugRp.png", "8.jpg", "soft"),
]


def sample_key(arr: np.ndarray) -> np.ndarray:
    h, w, _ = arr.shape
    patches = [
        arr[0:12, 0:12],
        arr[0:12, w - 12 : w],
        arr[h - 12 : h, 0:12],
        arr[h - 12 : h, w - 12 : w],
    ]
    return np.median(np.concatenate([p.reshape(-1, 3) for p in patches], axis=0), axis=0)


def key_image(im: Image.Image, mode: str) -> Image.Image:
    arr = np.asarray(im.convert("RGB"), dtype=np.float32)
    key = sample_key(arr)
    dist = np.sqrt(((arr - key) ** 2).sum(axis=2))
    rg = arr[:, :, 0] - arr[:, :, 1]
    bg = arr[:, :, 2] - arr[:, :, 1]
    mag = np.clip((rg + bg - 20.0) / 160.0, 0.0, 1.0)
    gold = (arr[:, :, 0] > 160) & (arr[:, :, 1] > 110) & (arr[:, :, 2] < 110)
    cyan = (arr[:, :, 1] > 130) & (arr[:, :, 2] > 150) & (arr[:, :, 0] < 160)
    protect = gold | cyan

    if mode == "hard":
        kill = 42.0
        keep = 78.0
    else:
        kill = 28.0
        keep = 95.0

    score = np.clip(1.0 - (dist - kill) / (keep - kill), 0.0, 1.0)
    score = np.maximum(score, mag)
    score = np.where(protect, score * 0.15, score)

    alpha = (1.0 - np.clip((score - 0.35) / 0.50, 0.0, 1.0)) * 255.0
    if mode == "hard":
        alpha = np.where(dist < kill, 0.0, alpha)
        alpha = np.where((dist < 58.0) & (mag > 0.45), 0.0, alpha)
    else:
        alpha = np.where(dist < kill, 0.0, alpha)

    spill = np.clip(mag, 0.0, 1.0)[..., None]
    g = arr[:, :, 1:2]
    rgb = arr * (1.0 - spill * 0.78) + np.concatenate([g, g, g], axis=2) * (spill * 0.78)
    rgb = np.clip(rgb, 0, 255)

    rgba = np.dstack([rgb, alpha]).astype(np.uint8)
    rgba[alpha < 6, :] = 0
    return Image.fromarray(rgba, "RGBA")


def crop_alpha(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def main() -> None:
    sky_src = SESSION / "4.jpg"
    sky_dst = OUT / "LaunchPrepNightSky.jpg"
    Image.open(sky_src).convert("RGB").save(sky_dst, "JPEG", quality=92, optimize=True)
    print(f"LaunchPrepNightSky.jpg {sky_dst.stat().st_size} bytes")

    for name, src_name, mode in JOBS:
        src = SESSION / src_name
        if not src.exists():
            raise SystemExit(f"missing {src}")
        keyed = crop_alpha(key_image(Image.open(src), mode))
        dst = OUT / name
        keyed.save(dst, "PNG", optimize=True)
        px = np.asarray(keyed)
        a = px[:, :, 3]
        print(
            f"{name} {keyed.width}x{keyed.height} "
            f"opaque={(a == 255).sum()} partial={((a > 0) & (a < 255)).sum()} "
            f"trans={(a == 0).sum()} bytes={dst.stat().st_size}"
        )


if __name__ == "__main__":
    main()
