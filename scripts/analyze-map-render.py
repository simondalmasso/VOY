#!/usr/bin/env python3
import argparse
import json
import math
import struct
import zlib
from collections import Counter
from pathlib import Path

# Calibrated from blocked candidate artifact 8988146964. The blocked gray map-shell
# is intentionally far below the acceptance thresholds below.
BLOCKED_REFERENCE = {
    "artifact": 8988146964,
    "gray_stddev": 4.264107,
    "entropy_bits": 0.236093,
    "unique_colors": 417,
    "mean_edge_gradient": 0.218492,
}
ROUTE_RGB = (109, 40, 217)       # #6d28d9
ORIGIN_RGB = (21, 101, 192)      # #1565c0
DESTINATION_RGB = (198, 40, 40)  # #c62828


def decode_png(path: Path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not_png:{path}")
    pos = 8
    width = height = color_type = bit_depth = None
    compressed = b""
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            if bit_depth != 8 or interlace != 0 or color_type not in (2, 6):
                raise ValueError(f"unsupported_png:{bit_depth}:{color_type}:{interlace}")
        elif kind == b"IDAT":
            compressed += chunk
        elif kind == b"IEND":
            break
    channels = 3 if color_type == 2 else 4
    stride = width * channels
    decoded = zlib.decompress(compressed)
    rows = []
    previous = bytearray(stride)
    cursor = 0
    for _ in range(height):
        filter_type = decoded[cursor]
        cursor += 1
        scan = bytearray(decoded[cursor:cursor + stride])
        cursor += stride
        recon = bytearray(stride)
        for index, value in enumerate(scan):
            left = recon[index - channels] if index >= channels else 0
            above = previous[index]
            upper_left = previous[index - channels] if index >= channels else 0
            if filter_type == 0:
                rebuilt = value
            elif filter_type == 1:
                rebuilt = (value + left) & 255
            elif filter_type == 2:
                rebuilt = (value + above) & 255
            elif filter_type == 3:
                rebuilt = (value + ((left + above) // 2)) & 255
            elif filter_type == 4:
                prediction = left + above - upper_left
                left_distance = abs(prediction - left)
                above_distance = abs(prediction - above)
                corner_distance = abs(prediction - upper_left)
                predictor = left if left_distance <= above_distance and left_distance <= corner_distance else (above if above_distance <= corner_distance else upper_left)
                rebuilt = (value + predictor) & 255
            else:
                raise ValueError(f"unsupported_png_filter:{filter_type}")
            recon[index] = rebuilt
        rows.append(recon)
        previous = recon
    return width, height, channels, rows


def analyze(path: Path, tolerance: int = 34):
    width, height, channels, rows = decode_png(path)
    x0, y0, x1, y1 = 2, 2, max(3, width - 2), max(3, height - 2)
    colors = []
    grays = []
    edge_total = 0.0
    edge_count = 0
    route_pixels = origin_pixels = destination_pixels = 0

    def near(rgb, target):
        return all(abs(rgb[channel] - target[channel]) <= tolerance for channel in range(3))

    previous_gray_row = None
    for y in range(y0, y1):
        row = rows[y]
        current_gray_row = []
        for x in range(x0, x1):
            offset = x * channels
            rgb = (row[offset], row[offset + 1], row[offset + 2])
            colors.append(rgb)
            gray = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
            grays.append(gray)
            current_gray_row.append(gray)
            route_pixels += int(near(rgb, ROUTE_RGB))
            origin_pixels += int(near(rgb, ORIGIN_RGB))
            destination_pixels += int(near(rgb, DESTINATION_RGB))
            if len(current_gray_row) > 1:
                edge_total += abs(current_gray_row[-1] - current_gray_row[-2])
                edge_count += 1
            if previous_gray_row is not None:
                edge_total += abs(gray - previous_gray_row[x - x0])
                edge_count += 1
        previous_gray_row = current_gray_row

    pixel_count = len(grays)
    mean = sum(grays) / pixel_count
    variance = sum((value - mean) ** 2 for value in grays) / pixel_count
    stddev = math.sqrt(variance)
    histogram = Counter(int(round(value)) for value in grays)
    entropy = -sum((count / pixel_count) * math.log2(count / pixel_count) for count in histogram.values())
    unique_colors = len(set(colors))
    mean_edge = edge_total / max(1, edge_count)

    thresholds = {
        "gray_stddev_min": 8.0,
        "entropy_bits_min": 1.5,
        "unique_colors_min": 128,
        "mean_edge_gradient_min": 0.35,
        "route_color_pixels_min": 35,
        "origin_color_pixels_min": 25,
        "destination_color_pixels_min": 25,
    }
    checks = {
        "basemap_non_flat": stddev >= thresholds["gray_stddev_min"] and entropy >= thresholds["entropy_bits_min"] and unique_colors >= thresholds["unique_colors_min"] and mean_edge >= thresholds["mean_edge_gradient_min"],
        "route_visible": route_pixels >= thresholds["route_color_pixels_min"],
        "origin_marker_visible": origin_pixels >= thresholds["origin_color_pixels_min"],
        "destination_marker_visible": destination_pixels >= thresholds["destination_color_pixels_min"],
    }
    return {
        "file": str(path),
        "width": width,
        "height": height,
        "pixels_analyzed": pixel_count,
        "gray_stddev": round(stddev, 6),
        "gray_variance": round(variance, 6),
        "entropy_bits": round(entropy, 6),
        "unique_colors": unique_colors,
        "mean_edge_gradient": round(mean_edge, 6),
        "route_color_pixels": route_pixels,
        "origin_color_pixels": origin_pixels,
        "destination_color_pixels": destination_pixels,
        "thresholds": thresholds,
        "checks": checks,
        "blocked_reference": BLOCKED_REFERENCE,
        "pass": all(checks.values()),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("images", nargs="+")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    results = [analyze(Path(image)) for image in args.images]
    payload = {"result": "PASS" if all(result["pass"] for result in results) else "FAIL", "images": results}
    Path(args.output).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))
    if payload["result"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
