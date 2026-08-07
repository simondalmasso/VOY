#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:?usage: run-gtfs-validator-gate.sh <feed.zip> <output-dir>}"
OUTPUT="${2:?usage: run-gtfs-validator-gate.sh <feed.zip> <output-dir>}"
VERSION='8.0.1'
ASSET="gtfs-validator-${VERSION}-cli.jar"
URL="https://github.com/MobilityData/gtfs-validator/releases/download/v${VERSION}/${ASSET}"
SHA256='19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2'
CACHE_DIR="${GTFS_VALIDATOR_CACHE_DIR:-/tmp/voy-gtfs-validator}"
JAR="$CACHE_DIR/$ASSET"

mkdir -p "$CACHE_DIR" "$OUTPUT"
if [[ ! -f "$JAR" ]]; then
  curl --fail --location --silent --show-error --retry 3 "$URL" --output "$JAR"
fi
printf '%s  %s\n' "$SHA256" "$JAR" | sha256sum --check --strict
java -version
java -jar "$JAR" -i "$INPUT" -o "$OUTPUT"
test -s "$OUTPUT/report.json"
test -f "$OUTPUT/system_errors.json"
node scripts/evaluate-gtfs-report.mjs "$OUTPUT/report.json" "$OUTPUT/system_errors.json" "$OUTPUT/voy-gate-summary.json"
