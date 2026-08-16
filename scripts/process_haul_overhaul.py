"""Process Imagine haul overhaul assets into public/ sprites."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path(
    r"C:\Users\antho\.grok\sessions\C%3A%5CUsers%5Cantho%5COrbit26\01a00c1f-94c2-76d0-83b8-e8bb24a01ec5\images"
)
OUT = Path(r"C:\Users\antho\Orbit26\public")
REVIEW = Path(r"C:\Users\antho\Orbit26\scripts\_tile_review")
REVIEW.mkdir(parents=True, exist_ok=True)


def save_jpg(im: Image.Image, name: str, quality: int = 92) -> None:
    dest = OUT / name
    im.convert("RGB").save(dest, quality=quality, optimize=True)
    print(f"wrote {dest} {im.size}")


def save_png(im: Image.Image, name: str) -> None:
    dest = OUT / name
    im.save(dest, optimize=True)
    print(f"wrote {dest} {im.size} {im.mode}")


def key_magenta(im: Image.Image) -> Image.Image:
    rgb = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta = (
        (r > 145)
        & (g < 150)
        & ((r - g) > 40)
        & (b > 70)
        & (b > g - 10)
        & ((r - b) < 110)
    )
    # Also catch lighter pink fringes
    fringe = (
        (r > 160)
        & (g > 90)
        & (g < 175)
        & ((r - g) > 25)
        & (b > 100)
        & ((r - b) < 80)
    )
    alpha = np.where(magenta, 0, 255).astype(np.uint8)
    alpha = np.where(fringe & ~magenta, 90, alpha)
    rgba = np.dstack([rgb.astype(np.uint8), alpha])
    out = Image.fromarray(rgba, "RGBA")
    # Despill remaining pink on the silhouette edge
    arr = np.asarray(out).copy()
    a = arr[..., 3]
    edge = (a > 0) & (a < 255)
    near = magenta.copy()
    # dilate magenta one pixel
    near[1:] |= magenta[:-1]
    near[:-1] |= magenta[1:]
    near[:, 1:] |= magenta[:, :-1]
    near[:, :-1] |= magenta[:, 1:]
    spill = near & (a > 20) & (arr[..., 0].astype(int) > arr[..., 1].astype(int) + 20)
    if spill.any():
        arr[spill, 0] = np.minimum(arr[spill, 0], arr[spill, 1] + 12)
        arr[spill, 2] = np.minimum(arr[spill, 2], arr[spill, 1] + 18)
    keyed = Image.fromarray(arr, "RGBA")
    # Crop to opaque bounds with padding
    bbox = keyed.getchannel("A").point(lambda p: 255 if p > 12 else 0).getbbox()
    if not bbox:
        return keyed
    pad = 8
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(keyed.width, x1 + pad)
    y1 = min(keyed.height, y1 + pad)
    return keyed.crop((x0, y0, x1, y1))


def make_runway_tile(im: Image.Image) -> Image.Image:
    """Keep the Imagine taxiway; soften the left/right join for path repeats."""
    im = im.convert("RGB")
    w, h = im.size
    overlap = max(24, w // 28)
    arr = np.asarray(im).astype(np.float32)
    fade = np.linspace(0.0, 1.0, overlap, dtype=np.float32)
    fade = fade * fade * (3.0 - 2.0 * fade)
    out = arr.copy()
    for i in range(overlap):
        t = fade[i]
        out[:, w - overlap + i] = (1.0 - t) * arr[:, w - overlap + i] + t * arr[:, i]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def crop_corner(im: Image.Image) -> Image.Image:
    """Square crop around the curved right side of the 2:1 corner plate."""
    im = im.convert("RGB")
    w, h = im.size
    side = h
    x0 = max(0, w - side - int(w * 0.02))
    return im.crop((x0, 0, x0 + side, h)).resize((768, 768), Image.Resampling.LANCZOS)


def crop_asphalt_fill(im: Image.Image) -> Image.Image:
    """Center band between the yellow lines — used for corner fillets."""
    im = im.convert("RGB")
    w, h = im.size
    band = im.crop((int(w * 0.28), int(h * 0.32), int(w * 0.72), int(h * 0.68)))
    return band.resize((256, 256), Image.Resampling.LANCZOS)


def crop_coast_strip(im: Image.Image) -> Image.Image:
    """Thin 54:480-aspect slice: sand | foam | water."""
    im = im.convert("RGB")
    w, h = im.size
    target_aspect = 54 / 480
    crop_w = max(8, int(round(h * target_aspect)))
    # Wider source band (sand → foam → water), then fit the map strip.
    x0 = int(w * 0.08)
    x1 = int(w * 0.72)
    strip = im.crop((x0, 0, x1, h))
    return strip.resize((280, 1920), Image.Resampling.LANCZOS)


def main() -> None:
    runway = Image.open(SRC / "10.jpg")
    print("runway", runway.size)
    save_jpg(make_runway_tile(runway), "HaulRunwayTile.jpg")
    save_jpg(crop_asphalt_fill(runway), "HaulRunwayFill.jpg", quality=90)

    corner_src = Image.open(SRC / "13.jpg")
    print("corner", corner_src.size)
    save_jpg(crop_corner(corner_src), "HaulRunwayCorner.jpg")

    coast = Image.open(SRC / "9.jpg")
    print("coast", coast.size)
    save_jpg(crop_coast_strip(coast), "HaulCoastStrip.jpg", quality=93)

    trees = [
        ("8.jpg", "HaulTreeA.png"),
        ("11.jpg", "HaulTreeB.png"),
        ("12.jpg", "HaulTreeC.png"),
    ]
    for src_name, dest in trees:
        keyed = key_magenta(Image.open(SRC / src_name))
        save_png(keyed, dest)
        keyed.resize((512, 512), Image.Resampling.LANCZOS).save(
            REVIEW / dest.replace(".png", "_preview.png")
        )


if __name__ == "__main__":
    main()
