#!/usr/bin/env python3
"""Derive the VOY bus-top sprite from the recovered Gemini/Firefly source PNG.

The source image has an RGB checkerboard baked into its pixels (no alpha channel).
This script removes that neutral bright background, preserves the yellow/black bus,
rotates the front to north, downsamples with alpha-aware area averaging, and writes RGBA PNG.
"""
from __future__ import annotations
import hashlib
import json
import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts-live" / "source-assets" / "gemini-bus-source-746791.png"
OUTPUT = ROOT / "public" / "transit" / "markers" / "bus-top.png"
EXPECTED_SOURCE_SHA256 = "d5fdf5a9984842d667b997a7dcd1ead6f2913d0d40e03adc16ba7074d6d38609"
TARGET_WIDTH = 34
TARGET_HEIGHT = 102


def chunks(data: bytes):
    offset = 8
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + length]
        yield kind, payload
        offset += length + 12
        if kind == b"IEND":
            break


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    return a if pa <= pb and pa <= pc else b if pb <= pc else c


def decode_rgb_png(path: Path):
    data = path.read_bytes()
    width = height = bit_depth = color_type = interlace = None
    idat = []
    for kind, payload in chunks(data):
        if kind == b"IHDR":
            width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
        elif kind == b"IDAT":
            idat.append(payload)
    if (bit_depth, color_type, interlace) != (8, 2, 0):
        raise ValueError(f"Expected non-interlaced 8-bit RGB source, got bit_depth={bit_depth}, color_type={color_type}, interlace={interlace}")
    raw = zlib.decompress(b"".join(idat))
    stride, bpp = width * 3, 3
    rows, previous, offset = [], bytearray(width * 3), 0
    for _ in range(height):
        filter_type = raw[offset]
        offset += 1
        source = raw[offset:offset + stride]
        offset += stride
        row = bytearray(stride)
        for i, value in enumerate(source):
            left = row[i - bpp] if i >= bpp else 0
            up = previous[i]
            upper_left = previous[i - bpp] if i >= bpp else 0
            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = up
            elif filter_type == 3:
                predictor = (left + up) // 2
            elif filter_type == 4:
                predictor = paeth(left, up, upper_left)
            else:
                raise ValueError(f"Unsupported PNG filter {filter_type}")
            row[i] = (value + predictor) & 255
        rows.append(row)
        previous = row
    return width, height, rows


def clamp_byte(value: float) -> int:
    return max(0, min(255, int(round(value))))


def remove_checkerboard(rows, width, height):
    rgba_rows = []
    for row in rows:
        out = bytearray(width * 4)
        for x in range(width):
            i, j = x * 3, x * 4
            r, g, b = row[i], row[i + 1], row[i + 2]
            average = (r + g + b) / 3.0
            chroma = max(r, g, b) - min(r, g, b)
            if chroma <= 16:
                if average >= 195:
                    alpha, rgb = 0, (0, 0, 0)
                elif average <= 75:
                    alpha, rgb = 255, (r, g, b)
                else:
                    background = 225.0 if average < 238 else 255.0
                    alpha = clamp_byte((1.0 - average / background) * 255.0)
                    if alpha >= 160:
                        alpha = 255
                    rgb = (0, 0, 0)
            elif r > g + 12 and g > b + 20:
                # The bus is yellow. Its blue channel is near zero; R-B estimates
                # coverage against the neutral checkerboard. Remove background spill
                # from the partially covered edge pixels before writing alpha.
                alpha = clamp_byte((r - b) / 255.0 * 255.0)
                if alpha <= 2:
                    alpha, rgb = 0, (0, 0, 0)
                else:
                    coverage = alpha / 255.0
                    background = 225.0 if average < 238 else 255.0
                    rgb = tuple(clamp_byte((channel - (1.0 - coverage) * background) / coverage) for channel in (r, g, b))
                    if alpha >= 160:
                        # Keep solid paint opaque; only a narrow antialiased fringe
                        # retains partial alpha after background-color decontamination.
                        alpha = 255
            else:
                alpha, rgb = 255, (r, g, b)
            out[j:j + 4] = bytes((rgb[0], rgb[1], rgb[2], alpha))
        rgba_rows.append(out)
    return rgba_rows


def crop_rgba(rows, width, height, threshold=8, padding=14):
    xs, ys = [], []
    for y, row in enumerate(rows):
        for x in range(width):
            if row[x * 4 + 3] > threshold:
                xs.append(x)
                ys.append(y)
    if not xs:
        raise ValueError("Background removal produced an empty image")
    x0, x1 = max(0, min(xs) - padding), min(width - 1, max(xs) + padding)
    y0, y1 = max(0, min(ys) - padding), min(height - 1, max(ys) + padding)
    return [bytearray(row[x0 * 4:(x1 + 1) * 4]) for row in rows[y0:y1 + 1]], x1 - x0 + 1, y1 - y0 + 1, [x0, y0, x1, y1]


def rotate_clockwise(rows, width, height):
    # Source front points left. A clockwise quarter-turn makes the front point north.
    out_width, out_height = height, width
    out = [bytearray(out_width * 4) for _ in range(out_height)]
    for y, row in enumerate(rows):
        for x in range(width):
            dx, dy = height - 1 - y, x
            src, dst = x * 4, dx * 4
            out[dy][dst:dst + 4] = row[src:src + 4]
    return out, out_width, out_height


def resize_area(rows, width, height, out_width, out_height):
    out = []
    for dy in range(out_height):
        y0, y1 = dy * height / out_height, (dy + 1) * height / out_height
        row_out = bytearray(out_width * 4)
        for dx in range(out_width):
            x0, x1 = dx * width / out_width, (dx + 1) * width / out_width
            sum_weight = sum_alpha = sum_r = sum_g = sum_b = 0.0
            for sy in range(math.floor(y0), math.ceil(y1)):
                wy = max(0.0, min(y1, sy + 1) - max(y0, sy))
                for sx in range(math.floor(x0), math.ceil(x1)):
                    wx = max(0.0, min(x1, sx + 1) - max(x0, sx))
                    weight = wx * wy
                    if weight <= 0:
                        continue
                    pixel = rows[sy][sx * 4:sx * 4 + 4]
                    alpha = pixel[3] / 255.0
                    sum_weight += weight
                    sum_alpha += alpha * weight
                    sum_r += pixel[0] * alpha * weight
                    sum_g += pixel[1] * alpha * weight
                    sum_b += pixel[2] * alpha * weight
            dst = dx * 4
            alpha_fraction = sum_alpha / sum_weight if sum_weight else 0
            alpha_byte = clamp_byte(alpha_fraction * 255.0)
            if sum_alpha > 0:
                rgb = (clamp_byte(sum_r / sum_alpha), clamp_byte(sum_g / sum_alpha), clamp_byte(sum_b / sum_alpha))
            else:
                rgb = (0, 0, 0)
            row_out[dst:dst + 4] = bytes((rgb[0], rgb[1], rgb[2], alpha_byte))
        out.append(row_out)
    return out


def encode_rgba_png(path: Path, rows, width: int, height: int):
    def paeth_filter(a: int, b: int, c: int) -> int:
        p = a + b - c
        pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
        return a if pa <= pb and pa <= pc else b if pb <= pc else c
    raw_parts, previous = [], bytearray(width * 4)
    for row in rows:
        candidates = []
        for filter_type in range(5):
            filtered = bytearray(len(row))
            score = 0
            for i, value in enumerate(row):
                left = row[i - 4] if i >= 4 else 0
                up = previous[i]
                upper_left = previous[i - 4] if i >= 4 else 0
                if filter_type == 0:
                    predictor = 0
                elif filter_type == 1:
                    predictor = left
                elif filter_type == 2:
                    predictor = up
                elif filter_type == 3:
                    predictor = (left + up) // 2
                else:
                    predictor = paeth_filter(left, up, upper_left)
                result = (value - predictor) & 255 if filter_type else value
                filtered[i] = result
                score += min(result, 256 - result)
            candidates.append((score, filter_type, filtered))
        _, filter_type, filtered = min(candidates, key=lambda item: item[0])
        raw_parts.append(bytes([filter_type]) + bytes(filtered))
        previous = row
    raw = b"".join(raw_parts)
    def chunk(kind: bytes, payload: bytes):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return data


def main():
    source_bytes = SOURCE.read_bytes()
    source_sha = hashlib.sha256(source_bytes).hexdigest()
    if source_sha != EXPECTED_SOURCE_SHA256:
        raise SystemExit(f"Source SHA-256 mismatch: {source_sha}")
    width, height, rgb_rows = decode_rgb_png(SOURCE)
    alpha_rows = remove_checkerboard(rgb_rows, width, height)
    cropped, crop_width, crop_height, bounds = crop_rgba(alpha_rows, width, height)
    rotated, rotated_width, rotated_height = rotate_clockwise(cropped, crop_width, crop_height)
    resized = resize_area(rotated, rotated_width, rotated_height, TARGET_WIDTH, TARGET_HEIGHT)
    data = encode_rgba_png(OUTPUT, resized, TARGET_WIDTH, TARGET_HEIGHT)
    alpha_values = [row[i] for row in resized for i in range(3, len(row), 4)]
    report = {
        "source": str(SOURCE.relative_to(ROOT)),
        "source_sha256": source_sha,
        "source_size": [width, height],
        "source_color_type": 2,
        "source_has_alpha": False,
        "crop_bounds_in_source": bounds,
        "crop_size_before_rotation": [crop_width, crop_height],
        "rotation": "90deg clockwise; front points north",
        "output": str(OUTPUT.relative_to(ROOT)),
        "output_sha256": hashlib.sha256(data).hexdigest(),
        "output_bytes": len(data),
        "output_size": [TARGET_WIDTH, TARGET_HEIGHT],
        "output_color_type": 6,
        "transparent_pixels": sum(a == 0 for a in alpha_values),
        "opaque_pixels": sum(a == 255 for a in alpha_values),
        "partial_alpha_pixels": sum(0 < a < 255 for a in alpha_values),
    }
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
