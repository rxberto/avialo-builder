#!/bin/sh
# Aplica el branding de Avialo al panel admin de Medusa ya compilado.
# Se ejecuta en el Dockerfile DESPUÉS de `medusa build`.
#
# Enfoque ROBUSTO: NO se toca el bundle JS (hasheado/cacheado y frágil). Todo el branding
# se inyecta vía index.html (que se sirve fresco en cada carga):
#   - idioma español: avialo-lang.js (script clásico bloqueante ANTES del bundle) fuerza
#     navigator.language='es' + localStorage i18nextLng='es' (el admin trae traducción 'es'),
#   - favicon de Avialo (sustituye el placeholder que Medusa repone por JS),
#   - <title> de la pestaña,
#   - avialo-admin.js: logo del login (<svg> → <img> Avialo) + "Medusa" → "Avialo" + título.
set -e

ADMIN_DIR=/app/.medusa/server/public/admin
INDEX="$ADMIN_DIR/index.html"
BRAND_DIR="$(dirname "$0")"
V=6

if [ ! -f "$INDEX" ]; then
  echo "[brand] index.html del admin no encontrado en $INDEX — ¿se ejecutó 'medusa build'? Abortando branding."
  exit 0
fi

# Activos de marca servidos desde /app/...
cp "$BRAND_DIR/avialo-favicon.svg" "$ADMIN_DIR/avialo-favicon.svg"
cp "$BRAND_DIR/avialo-lang.js" "$ADMIN_DIR/avialo-lang.js"
cp "$BRAND_DIR/avialo-admin.js" "$ADMIN_DIR/avialo-admin.js"

# 0) Idioma en el <html> (cubre el detector i18next 'htmlTag').
sed -i 's#<html>#<html lang="es">#' "$INDEX"

# 1) Favicon Avialo (sin el atributo placeholder → el JS de Medusa no lo reemplaza).
sed -i 's#<link rel="icon" href="data:," data-placeholder-favicon />#<link rel="icon" type="image/svg+xml" href="/app/avialo-favicon.svg" />#' "$INDEX"

# 2) Idioma español: script clásico bloqueante ANTES del module (que es diferido).
if ! grep -q "avialo-lang.js" "$INDEX"; then
  sed -i "s#<script type=\"module\"#<script src=\"/app/avialo-lang.js?v=$V\"></script>\n      <script type=\"module\"#" "$INDEX"
fi

# 3) Título de la pestaña (visible en la carga/login).
if ! grep -q "<title>" "$INDEX"; then
  sed -i 's#</head>#    <title>Avialo · Panel de tienda</title>\n    </head>#' "$INDEX"
fi

# 4) JS de marca (logo + texto + título) al final del body.
if ! grep -q "avialo-admin.js" "$INDEX"; then
  sed -i "s#</body>#    <script src=\"/app/avialo-admin.js?v=$V\"></script>\n    </body>#" "$INDEX"
fi

echo "[brand] Branding de Avialo aplicado (español forzado + favicon + logo + título)."
