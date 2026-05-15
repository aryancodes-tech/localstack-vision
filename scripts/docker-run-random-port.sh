#!/usr/bin/env bash
set -euo pipefail

# IANA dynamic/private port range.
readonly lo=49152
readonly hi=65535
host_port=$((RANDOM % (hi - lo + 1) + lo))

image="${1:-localstack-vision}"
root="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building ${image}…"
docker build -t "${image}" "${root}"

echo "Listening on http://127.0.0.1:${host_port}/ (maps to container :8080)"
exec docker run --rm -p "${host_port}:8080" "${image}"
