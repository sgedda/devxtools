#!/usr/bin/env bash
# Send the same 12× /hello + 12× /health pattern recorded on 2026-11-10.
set -euo pipefail
PORT="${PORT:-8080}"
HOST="${HOST:-127.0.0.1}"
for i in $(seq 1 12); do
  curl -sS "http://${HOST}:${PORT}/hello"
  echo
  curl -sS "http://${HOST}:${PORT}/health"
  echo
  sleep 0.2
done
