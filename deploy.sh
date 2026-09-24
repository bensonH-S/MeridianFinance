#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -z "${DEPLOY_REEXEC:-}" ]; then
  bak="$(mktemp /tmp/meridian-finance-deploy.XXXXXX.sh)"
  cp "$0" "$bak"
  chmod +x "$bak"
  DEPLOY_REEXEC=1 exec "$bak"
fi

echo "Atualizando tags..."
git fetch origin --tags

LATEST_TAG="$(git --no-pager tag --sort=v:refname | tail -n 1)"
echo ""
echo "Ultima versao: ${LATEST_TAG:-nenhuma}"
git --no-pager tag --sort=v:refname | tail -n 10
echo ""
echo "Enter = usar a ultima versao (${LATEST_TAG})"
read -r -p "Digite a tag para deploy: " TAG
if [ -z "$TAG" ]; then
  TAG="$LATEST_TAG"
fi

if ! git rev-parse "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "Tag invalida: $TAG"
  exit 1
fi

echo ""
echo "Iniciando deploy: $TAG"
git checkout "tags/${TAG}" -f

if [ ! -f .env ]; then
  echo "ERRO: .env nao encontrado em $(pwd)"
  exit 1
fi

npm install --omit=dev
(cd frontend && npm install && npm run build)
sudo systemctl restart meridian-finance
sleep 1
curl -s -o /dev/null -w "http %{http_code}\n" http://127.0.0.1:3018/financas/
