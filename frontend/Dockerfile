# ── Etapa 1: build del IDE (Vite) ──
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Instala dependencias. Usamos `npm install` (no `npm ci`) porque el package-lock.json
# del repo puede ir desincronizado con package.json (p.ej. optional deps @emnapi/*), y
# `npm ci` aborta en ese caso. `npm install` lo resuelve de forma robusta en el build.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Variables VITE_* en BUILD-TIME: Vite las inyecta en el bundle, así que deben
# estar disponibles aquí (no en runtime). Llegan como build-args desde compose.
ARG VITE_API_URL=https://api.avialo.app
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_STRIPE_PUBLISHABLE_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

COPY . .
RUN npm run build

# ── Etapa 2: servir el estático con nginx ──
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
