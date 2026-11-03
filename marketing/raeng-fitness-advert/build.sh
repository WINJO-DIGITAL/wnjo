#!/usr/bin/env bash
# Builds the RAENG Fitness website advert from fresh captures of the live site.
#   ./build.sh            capture + sound + render + mux
#   SKIP_CAPTURE=1 ./build.sh   reuse build/capture
set -euo pipefail
cd "$(dirname "$0")"
[ "${SKIP_CAPTURE:-}" = 1 ] || node capture.cjs
python3 sound.py
node render.cjs
ffmpeg -y -loglevel error -i build/video.mp4 -i build/sound.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \
  raeng-fitness-advert.mp4
ffmpeg -y -loglevel error -ss 12.6 -i raeng-fitness-advert.mp4 -frames:v 1 -q:v 2 poster.jpg
echo "Wrote raeng-fitness-advert.mp4 and poster.jpg"
