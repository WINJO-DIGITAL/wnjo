#!/usr/bin/env bash
# Builds the RAENG Fitness website advert from fresh captures of the live site.
#   ./build.sh                    capture + music + render + mux (MUSIC=pulse)
#   MUSIC=drive ./build.sh        pick the track: pulse | circuit | drive
#   SKIP_CAPTURE=1 ./build.sh     reuse build/capture
# Also writes every music option to options/ for comparison.
set -euo pipefail
cd "$(dirname "$0")"
MUSIC="${MUSIC:-pulse}"
[ "${SKIP_CAPTURE:-}" = 1 ] || node capture.cjs
python3 music.py all
node render.cjs
mkdir -p options
for n in pulse circuit drive; do
  ffmpeg -y -loglevel error -i build/video.mp4 -i "build/music-$n.wav" \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart \
    "options/raeng-fitness-advert-$n.mp4"
done
cp "options/raeng-fitness-advert-$MUSIC.mp4" raeng-fitness-advert.mp4
ffmpeg -y -loglevel error -ss 14.5 -i raeng-fitness-advert.mp4 -frames:v 1 -q:v 2 poster.jpg
echo "Wrote raeng-fitness-advert.mp4 ($MUSIC), options/ and poster.jpg"
