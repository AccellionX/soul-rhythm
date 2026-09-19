#!/usr/bin/env python3
"""Convert scene PNGs in images/ to JPEG under 400KB, then delete the PNG."""

from pathlib import Path

from PIL import Image

MAX = 400 * 1024
SCENES = ("neighborhood", "porch", "pond", "study", "garage")
DIR = Path(__file__).resolve().parent.parent / "images"


def save_jpeg(image, dest, quality, max_side=None):
    work = image
    if max_side and max(image.size) > max_side:
        work = image.copy()
        work.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    work.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)


def compress_one(src):
    dest = src.with_suffix(".jpg")
    image = Image.open(src)
    if image.mode != "RGB":
        image = image.convert("RGB")
    for max_side in (None, 1600, 1400, 1280):
        for quality in range(85, 59, -5):
            save_jpeg(image, dest, quality, max_side)
            size = dest.stat().st_size
            if size <= MAX:
                src.unlink()
                extra = f", max {max_side}" if max_side else ""
                print(f"Wrote {dest.name} ({size // 1024}KB, q{quality}{extra})")
                return
    raise SystemExit(f"Could not get {src.name} under 400KB")


def main():
    converted = False
    for name in SCENES:
        png = DIR / f"{name}.png"
        if png.is_file():
            compress_one(png)
            converted = True
    if not converted:
        print("No scene PNGs to convert.")


if __name__ == "__main__":
    main()
