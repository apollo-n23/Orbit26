from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(
    r"C:\Users\antho\.grok\sessions\C%3A%5CUsers%5Cantho%5COrbit26\01a00c1f-94c2-76d0-83b8-e8bb24a01ec5\images"
)
OUT = Path(r"C:\Users\antho\Orbit26\public")
REVIEW = Path(r"C:\Users\antho\Orbit26\scripts\_tile_review")


def flood_key(rgb: np.ndarray, start_limit: float) -> np.ndarray:
    """Key studio backdrop by flooding from the image edges."""
    h, w = rgb.shape[:2]
    # Sample mean of a 12px border
    border = np.concatenate(
        [
            rgb[0:12].reshape(-1, 3),
            rgb[-12:].reshape(-1, 3),
            rgb[:, 0:12].reshape(-1, 3),
            rgb[:, -12:].reshape(-1, 3),
        ]
    )
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float32) - bg, axis=2)
    r0, g0, b0 = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    magenta_hue = (r0 - g0 > 18) & (b0 > g0 - 15)
    visit = (dist < start_limit) & magenta_hue
    # Grow from every edge pixel that is already close to bg
    seen = np.zeros((h, w), dtype=bool)
    stack: list[tuple[int, int]] = []
    for x in range(w):
        if visit[0, x]:
            stack.append((0, x))
        if visit[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if visit[y, 0]:
            stack.append((y, 0))
        if visit[y, w - 1]:
            stack.append((y, w - 1))
    grow = start_limit + 18
    while stack:
        y, x = stack.pop()
        if seen[y, x]:
            continue
        seen[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                pr, pg, pb = rgb[ny, nx]
                magenta_hue = (pr - pg > 18) and (pb > pg - 15)
                if dist[ny, nx] < grow and magenta_hue:
                    stack.append((ny, nx))
    return seen


def key(path: Path, dest_name: str, _bg: tuple[float, float, float], limit: float) -> None:
    rgb_u8 = np.asarray(Image.open(path).convert("RGB"))
    keyed_mask = flood_key(rgb_u8, limit)
    alpha = np.where(keyed_mask, 0, 255).astype(np.uint8)
    # Soften one-pixel fringe
    fringe = keyed_mask.copy()
    fringe[1:] |= keyed_mask[:-1]
    fringe[:-1] |= keyed_mask[1:]
    fringe[:, 1:] |= keyed_mask[:, :-1]
    fringe[:, :-1] |= keyed_mask[:, 1:]
    edge = fringe & ~keyed_mask
    alpha[edge] = 90
    keyed = Image.fromarray(np.dstack([rgb_u8, alpha]), "RGBA")
    bbox = keyed.getchannel("A").point(lambda p: 255 if p > 18 else 0).getbbox()
    if bbox:
        pad = 6
        x0, y0, x1, y1 = bbox
        keyed = keyed.crop(
            (
                max(0, x0 - pad),
                max(0, y0 - pad),
                min(keyed.width, x1 + pad),
                min(keyed.height, y1 + pad),
            )
        )
    dest = OUT / dest_name
    keyed.save(dest, optimize=True)
    preview = Image.new("RGB", keyed.size, (48, 88, 48))
    preview.paste(keyed, mask=keyed.split()[-1])
    preview.save(REVIEW / f"{dest_name}_on_green.jpg", quality=88)
    a = np.asarray(keyed)[..., 3]
    print(dest_name, keyed.size, "transparent", float((a == 0).mean()))


key(SRC / "19.jpg", "HaulAssemblyTop.png", (190.0, 40.0, 110.0), 70)
key(SRC / "21.jpg", "HaulOfficesTop.png", (162.0, 84.0, 123.0), 62)
