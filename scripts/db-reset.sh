#!/usr/bin/env bash
set -euo pipefail

echo "This will wipe local Postgres volumes and reseed migrations."
read -p "Proceed? (y/N) " ans
if [[ "${ans:-N}" != "y" && "${ans:-N}" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Stopping and removing containers + volumes..."
docker compose down -v

echo "Starting db..."
docker compose up -d db

echo "Rebuilding and starting services (api, ai, web) to run migrations and reseed..."
docker compose up -d --build api ai web ngrok

echo "Done. Check logs with: docker compose logs -f api"
