#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-/tmp/voy-gtfs-fixture.zip}"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
cat > "$DIR/agency.txt" <<'EOF'
agency_id,agency_name,agency_url,agency_timezone
fixture,VOY Fixture Transit,https://example.test,America/Argentina/Cordoba
EOF
cat > "$DIR/stops.txt" <<'EOF'
stop_id,stop_name,stop_lat,stop_lon
A,Plaza 25 de Mayo,-31.633,-60.706
B,Terminal,-31.643533,-60.700503
EOF
cat > "$DIR/routes.txt" <<'EOF'
route_id,agency_id,route_short_name,route_long_name,route_type
R1,fixture,F1,Fixture Route,3
EOF
cat > "$DIR/trips.txt" <<'EOF'
route_id,service_id,trip_id,trip_headsign
R1,WK,T1,Terminal
EOF
cat > "$DIR/stop_times.txt" <<'EOF'
trip_id,arrival_time,departure_time,stop_id,stop_sequence
T1,08:00:00,08:00:00,A,1
T1,08:15:00,08:15:00,B,2
EOF
cat > "$DIR/calendar.txt" <<'EOF'
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
WK,1,1,1,1,1,1,1,20260801,20261231
EOF
cat > "$DIR/feed_info.txt" <<'EOF'
feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version
VOY Fixture Transit,https://example.test,es,20260801,20261231,issue34-fixture-v1
EOF
(
  cd "$DIR"
  zip -q -X "$OUT" agency.txt stops.txt routes.txt trips.txt stop_times.txt calendar.txt feed_info.txt
)
sha256sum "$OUT"
