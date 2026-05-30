#!/bin/sh
set -e

echo "⏳ Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "🚀 Arrancando servidor..."
exec node dist/server.js
