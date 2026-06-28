#!/bin/sh
# Arranque del backend Medusa compartido:
#  1) crea la base de datos si no existe,
#  2) aplica migraciones,
#  3) (opcional) siembra la infraestructura base,
#  4) (opcional) asegura el usuario admin,
#  5) arranca el servidor.
#
# En producción, tras `medusa build`, los comandos del servidor (migrate/start) se ejecutan
# desde `.medusa/server` (que contiene el build compilado + el panel admin en public/admin).
set -e

APP_DIR=/app
SERVER_DIR=/app/.medusa/server
# El binario vive en /app/node_modules (.medusa/server no tiene node_modules propio,
# resuelve por node hacia el padre). Se invoca por ruta absoluta para evitar npx (que
# contacta el registro npm y puede colgarse en contenedores).
MEDUSA="$APP_DIR/node_modules/.bin/medusa"

echo "[medusa] Creando base de datos si no existe..."
node "$APP_DIR/scripts/create-db.cjs" || echo "[medusa] create-db omitido (ya existe o no aplicable)"

cd "$SERVER_DIR"

echo "[medusa] Aplicando migraciones..."
$MEDUSA db:migrate

if [ "${MEDUSA_SEED_BASE}" = "true" ]; then
  echo "[medusa] Sembrando infraestructura base (España)..."
  $MEDUSA exec ./src/scripts/seed-base.js || echo "[medusa] seed base omitido (ya aplicado)"
fi

if [ -n "${MEDUSA_ADMIN_EMAIL}" ] && [ -n "${MEDUSA_ADMIN_PASSWORD}" ]; then
  echo "[medusa] Asegurando usuario admin ${MEDUSA_ADMIN_EMAIL}..."
  $MEDUSA user -e "${MEDUSA_ADMIN_EMAIL}" -p "${MEDUSA_ADMIN_PASSWORD}" 2>/dev/null \
    || echo "[medusa] usuario admin ya existía"
fi

echo "[medusa] Arrancando servidor en :9000..."
exec $MEDUSA start
