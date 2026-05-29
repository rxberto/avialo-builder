#!/bin/bash

# ==============================================================================
# SCRIPT DE DESPLIEGUE CONTINUO — AVIALO BUILDER ORCHESTRATOR
# ==============================================================================
# Este script se ejecuta en el servidor de producción para validar variables,
# inicializar redes y redes Docker, y levantar la aplicación via Docker Compose.
# ==============================================================================

# Forzar salida en errores
set -e

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🚀 Iniciando despliegue de Avialo Builder en producción..."

# 1. COMPROBAR ARCHIVO .ENV
if [ ! -f .env ]; then
  echo "⚠️  No se encontró el archivo .env en el directorio 'infra/'."
  echo "👉 Creando una plantilla inicial a partir de .env.example..."
  cp .env.example .env
  echo "❌ Rellena las variables obligatorias en 'infra/.env' y vuelve a ejecutar este script."
  exit 1
fi

# 2. ASEGURAR PERMISOS CORRECTOS EN ACME.JSON
# Traefik exige que el almacén de certificados no sea accesible por otros usuarios (permisos 600)
if [ -f traefik/acme.json ]; then
  echo "🔑 Asegurando permisos 600 para traefik/acme.json..."
  chmod 600 traefik/acme.json
fi

# 3. CREAR LA RED DE ENRUTAMIENTO COMPARTIDA (SI NO EXISTE)
# Esta red permite que Traefik vea e intercomunique tanto los servicios core del SaaS
# como cada contenedor dinámico de los clientes generado por dockerode.
echo "🔌 Verificando red Docker 'avialo-network'..."
if ! docker network inspect avialo-network >/dev/null 2>&1; then
  echo "⚡ Creando red 'avialo-network' como red acoplable (attachable)..."
  docker network create --driver bridge --attachable avialo-network
  echo "✅ Red creada."
else
  echo "ℹ️  La red 'avialo-network' ya existe."
fi

# 4. DESPLEGAR SERVICIOS DOCKER COMPOSE
echo "📦 Construyendo y levantando contenedores en segundo plano..."
docker compose up -d --build

echo "🎉 ¡SERVICIOS LEVANTADOS Y CORRIENDO!"
echo "📡 Revisa los logs en tiempo real ejecutando: docker compose logs -f"
