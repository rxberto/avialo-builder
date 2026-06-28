# Backend Medusa v2 compartido de Avialo.
# Una sola imagen de larga duración: migra al arrancar y sirve Store/Admin API en :9000.
FROM node:20-bookworm-slim

# Herramientas de build para posibles módulos nativos de las dependencias de Medusa.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Yarn 4 (Berry) — mismo gestor que recomienda Medusa; npm rompe la carga de
# migraciones de módulos por su layout de node_modules (hoisting distinto).
RUN corepack enable

# Instala dependencias dentro del FS Linux del contenedor.
COPY package.json yarn.lock* .yarnrc.yml .npmrc ./
COPY .yarn ./.yarn
RUN yarn install

# Copia el código y compila el servidor + panel admin de Medusa.
COPY . .
RUN chmod +x docker-entrypoint.sh && yarn build

# Branding de Avialo sobre el panel admin compilado (favicon, título, textos).
RUN sh branding/brand.sh

ENV NODE_ENV=production
# Telemetría de Medusa off: su flush al salir abre una conexión HTTPS que puede colgarse
# en contenedores sin salida estable a internet.
ENV MEDUSA_DISABLE_TELEMETRY=true
EXPOSE 9000

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
