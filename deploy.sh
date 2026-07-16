#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-amsterdam_vm}"
REMOTE_DIR="${2:-~/practice}"
DOMAIN="${3:-praktika67.duckdns.org}"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> 1/4 Syncing project to $HOST:$REMOTE_DIR ..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='.env.local' \
  "$LOCAL_DIR/" "$HOST:$REMOTE_DIR/"

echo "==> 2/4 Applying production compose ..."
ssh "$HOST" "cp $REMOTE_DIR/compose.prod.yml $REMOTE_DIR/compose.yml"

echo "==> 3/4 Building and deploying ..."
ssh "$HOST" "cd $REMOTE_DIR && docker compose up -d --build"

echo "==> 4/4 Checking health ..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/" || echo "failed")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Deploy OK — $DOMAIN returns $HTTP_CODE"
else
  echo "⚠️  Deploy done, but $DOMAIN returned $HTTP_CODE — check logs:"
  echo "   ssh $HOST 'cd $REMOTE_DIR && docker compose logs --tail=20'"
fi
