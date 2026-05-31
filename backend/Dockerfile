FROM node:20-alpine

# Instalar herramientas para compilar dependencias si son necesarias (como make, gcc, g++)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalar todas las dependencias
RUN npm install

# Copiar el resto del código fuente del backend
COPY src ./src/

# Generar el cliente de Prisma ORM
RUN npx prisma generate

# Compilar TypeScript a JavaScript (dist/)
RUN npm run build

# Eliminar dependencias de desarrollo para aligerar la imagen
RUN npm prune --production

EXPOSE 3000

# Aplica migraciones y luego arranca el servidor
CMD ["npm", "start"]
