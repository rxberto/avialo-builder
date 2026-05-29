#!/bin/bash

# ==============================================================================
# SCRIPT DE CONFIGURACIÓN AUTOMÁTICA DE SERVIDOR VPS HETZNER (UBUNTU) — AVIALO
# ==============================================================================
# Este script prepara el entorno del servidor instalando Docker, configurando
# un espacio SWAP de 4GB para los builds de Next.js, y asegurando el firewall.
# ==============================================================================

# Forzar salida inmediata ante errores
set -e

# Asegurar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Por favor, ejecuta este script como root (sudo)."
  exit 1
fi

echo "🚀 Iniciando configuración del servidor VPS Hetzner..."

# 1. ACTUALIZACIÓN DEL SISTEMA
echo "🔄 1. Actualizando paquetes del sistema..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git ufw apt-transport-https ca-certificates gnupg lsb-release

# 2. CONFIGURACIÓN DE SWAP (4GB)
# Las compilaciones de Next.js y los agentes IA pueden llegar a consumir mucha RAM.
# Un swap de 4GB previene fallas de memoria (Out of Memory) en el VPS de 8GB.
if [ -f /swapfile ]; then
  echo "ℹ️  La SWAP ya está configurada en /swapfile. Saltando..."
else
  echo "💾 2. Creando archivo SWAP de 4GB..."
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  # Persistir SWAP tras reinicios
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
  # Ajustar valor de swappiness (prioriza RAM física)
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "✅ SWAP configurada exitosamente."
fi

# 3. INSTALACIÓN DE DOCKER ENGINE Y COMPOSER
if command -v docker &> /dev/null; then
  echo "ℹ️  Docker ya está instalado. Saltando..."
else
  echo "🐳 3. Instalando Docker y Docker Compose..."
  # Añadir la clave oficial de Docker
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Añadir el repositorio de Docker a las fuentes de APT
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  # Iniciar y habilitar servicio
  systemctl start docker
  systemctl enable docker
  echo "✅ Docker instalado correctamente."
fi

# 4. CONFIGURACIÓN DEL FIREWALL (UFW)
echo "🛡️  4. Configurando Firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Traefik'
ufw allow 443/tcp comment 'HTTPS Traefik'
# Habilitar UFW de forma no interactiva
ufw --force enable
echo "✅ Firewall configurado. Puertos abiertos: 22 (SSH), 80 (HTTP), 443 (HTTPS)."

# 5. PREPARAR CARPETAS Y PERMISOS DE CERTIFICADOS
echo "📂 5. Inicializando archivos para Traefik..."
mkdir -p /app/avialo-builder/infra/traefik
touch /app/avialo-builder/infra/traefik/acme.json
chmod 600 /app/avialo-builder/infra/traefik/acme.json

echo "🎉 ¡SERVIDIOR VPS CONFIGURADO CON ÉXITO!"
echo "👉 Ahora clona el repositorio en '/app/avialo-builder/' y ejecuta ./infra/scripts/deploy.sh"
