#!/bin/sh
# Deterministic specialist renderer. Inputs are frozen host assets mounted
# read-only at /render/input; output lands in /render/out. The container has
# no network and no credentials; rendering is derived purely from inputs.
set -eu

export HOME=/tmp
INPUT_DIR=/render/input
OUT_DIR=/render/out
FPS="${HYPERFRAME_FPS:-30}"
DURATION="${HYPERFRAME_DURATION_SECONDS:-3}"
WIDTH="${HYPERFRAME_WIDTH:-1280}"
HEIGHT="${HYPERFRAME_HEIGHT:-720}"

SCENE_HTML="$INPUT_DIR/scene.html"
if [ ! -f "$SCENE_HTML" ]; then
  echo "scene.html missing in $INPUT_DIR" >&2
  exit 2
fi

FRAME_COUNT=$(node -e "
  const dur = Number(process.env.HYPERFRAME_DURATION_SECONDS || 3);
  const fps = Number(process.env.HYPERFRAME_FPS || 30);
  console.log(Math.max(1, Math.round(dur * fps)));
")

mkdir -p "$OUT_DIR/frames"
cd "$OUT_DIR/frames"

i=0
while [ "$i" -lt "$FRAME_COUNT" ]; do
  FILE=$(printf 'f%04d.png' "$i")
  if ! chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
      --window-size="${WIDTH},${HEIGHT}" \
      --screenshot="$OUT_DIR/frames/current.png" \
      "file://$SCENE_HTML?frame=$i&width=$WIDTH&height=$HEIGHT&fps=$FPS" >/dev/null 2>&1; then
    echo "chromium failed on frame $i" >&2
    exit 3
  fi
  mv "$OUT_DIR/frames/current.png" "$FILE"
  i=$((i + 1))
done

ffmpeg -y -loglevel error -framerate "$FPS" -i 'f%04d.png' \
  -c:v libx264 -pix_fmt yuv420p -r "$FPS" \
  -movflags +faststart "$OUT_DIR/video.mp4"

echo "rendered $FRAME_COUNT frames to $OUT_DIR/video.mp4"
