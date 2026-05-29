const dotenv = require("dotenv");

// Carga las variables de entorno de forma segura
let ENV_FILE_NAME = "";
switch (process.env.NODE_ENV) {
  case "production":
    ENV_FILE_NAME = ".env.production";
    break;
  case "staging":
    ENV_FILE_NAME = ".env.staging";
    break;
  default:
    ENV_FILE_NAME = ".env";
    break;
}

try {
  dotenv.config({ path: process.cwd() + "/" + ENV_FILE_NAME });
} catch (e) {
  console.warn("⚠️ No se pudo cargar el archivo de entorno .env");
}

// Configuración de base de datos y Redis
const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost/medusa-store";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/** @type {import('@medusajs/medusa').Config} */
const config = {
  projectConfig: {
    databaseUrl: DATABASE_URL,
    redisUrl: REDIS_URL,
    httpCompression: {
      enabled: true,
    },
    // Configuración CORS
    storeCors: process.env.STORE_CORS || "http://localhost:8000,http://localhost:3000",
    adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:3000",
    authCors: process.env.AUTH_CORS || "http://localhost:7001,http://localhost:8000,http://localhost:3000",
    jwtSecret: process.env.JWT_SECRET || "super_secret_jwt_for_medusa_avialo",
    cookieSecret: process.env.COOKIE_SECRET || "super_secret_cookie_for_medusa_avialo",
  },
  // Plugins integrados obligatorios para la pyme (Stripe, Redis Cache)
  plugins: [
    {
      resolve: `@medusajs/payment-stripe`,
      options: {
        api_key: process.env.STRIPE_SECRET_KEY,
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
        // Captura automática de pagos en compras españolas
        capture: true,
      },
    },
  ],
};

module.exports = config;
