#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
for runtime in node22 node24; do
  case "$runtime" in
    node22) base='node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392' ;;
    node24) base='node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5' ;;
  esac
  image="zenmoney-typescript-s1-$runtime"
  docker build --target node --build-arg "NODE_IMAGE=$base" -t "$image" .
  docker run --rm --init --network none --read-only --tmpfs /tmp --tmpfs /app/.local/package-check "$image"
done
for target in reference browser; do
  image="zenmoney-typescript-s1-$target"
  docker build --target "$target" -t "$image" .
  docker run --rm --init --network none --read-only --tmpfs /tmp --shm-size 1g "$image"
done

image='zenmoney-typescript-s1-chrome120'
docker build --platform linux/amd64 -f Dockerfile.chrome120 -t "$image" .
docker run --rm --init --platform linux/amd64 --network none --read-only --tmpfs /tmp --shm-size 1g "$image"
