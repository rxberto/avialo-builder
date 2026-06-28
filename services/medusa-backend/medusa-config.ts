import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL
const STRIPE_API_KEY = process.env.STRIPE_API_KEY
// Canal interno hacia el orquestador (firma/verificación de Redsys con el secreto del tenant).
const ORCHESTRATOR_INTERNAL_URL = process.env.ORCHESTRATOR_INTERNAL_URL
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN
const MEDUSA_PUBLIC_URL = process.env.MEDUSA_PUBLIC_URL || process.env.MEDUSA_BACKEND_URL

// Cookie de sesión del panel admin. En producción Medusa la marca `Secure` (solo HTTPS), lo
// cual es correcto detrás de Traefik. PERO en pruebas LOCALES por http://localhost el flag
// Secure impide que el navegador guarde la cookie → /auth/session devuelve 200 sin Set-Cookie
// y el login del admin rebota una y otra vez. Para ese caso se arranca con
// MEDUSA_COOKIE_SECURE=false. `cookieOptions` sobrescribe el secure/sameSite que calcula el
// framework (ver @medusajs/framework express-loader: `cookie: { ...computed, ...cookieOptions }`).
const cookieOptions =
  process.env.MEDUSA_COOKIE_SECURE === 'false'
    ? { secure: false, sameSite: 'lax' as const }
    : undefined

// Definición tipada de un módulo de Medusa (sin `any`, según reglas del proyecto).
type ModuleDefinition = { resolve: string; options?: Record<string, unknown> }
// Definición de un provider dentro de un módulo (lleva `id` además de resolve/options).
type ProviderDefinition = { resolve: string; id: string; options?: Record<string, unknown> }

// Módulos opcionales: solo se añaden si hay configuración disponible.
// Permite arrancar sin Redis/Stripe en local y activarlos cuando estén listos.
const modules: ModuleDefinition[] = []

// Redis (cache + eventos + workflows) — necesario en producción (instancia compartida).
if (REDIS_URL) {
  modules.push(
    { resolve: '@medusajs/medusa/cache-redis', options: { redisUrl: REDIS_URL } },
    { resolve: '@medusajs/medusa/event-bus-redis', options: { redisUrl: REDIS_URL } },
    {
      resolve: '@medusajs/medusa/workflow-engine-redis',
      options: { redis: { url: REDIS_URL } },
    }
  )
}

// Módulo de pago: providers disponibles. Cada tienda ACTIVA uno desde su panel (Stripe Connect
// o Redsys); el checkout usa el provider id correspondiente.
const paymentProviders: ProviderDefinition[] = []

// Stripe Connect (provider PROPIO que extiende Stripe → destination charge a la cuenta del
// tenant). Provider id: `pp_stripe-connect_stripe`.
if (STRIPE_API_KEY) {
  paymentProviders.push({
    resolve: './src/modules/stripe-connect',
    id: 'stripe',
    options: {
      apiKey: STRIPE_API_KEY,
      // Captura automática típica de compras de pyme española.
      capture: true,
    },
  })
}

// Redsys (TPV español). La firma/verificación las hace el orquestador (custodia el secreto
// del tenant). Provider id: `pp_redsys_redsys`.
if (ORCHESTRATOR_INTERNAL_URL && INTERNAL_API_TOKEN) {
  paymentProviders.push({
    resolve: './src/modules/redsys',
    id: 'redsys',
    options: {
      orchestratorUrl: ORCHESTRATOR_INTERNAL_URL,
      internalToken: INTERNAL_API_TOKEN,
      webhookUrl: MEDUSA_PUBLIC_URL ? `${MEDUSA_PUBLIC_URL}/hooks/payment/pp_redsys_redsys` : undefined,
    },
  })
}

if (paymentProviders.length > 0) {
  modules.push({
    resolve: '@medusajs/medusa/payment',
    options: { providers: paymentProviders },
  })
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: REDIS_URL,
    // Pool de conexiones: min 0 (creación bajo demanda). El default de Medusa es min 2,
    // que crea 2 conexiones eager al arrancar; si la 2ª se atasca al establecerse, tarn
    // espera ese "create" pendiente y bloquea el acquire de transacciones (p.ej. migrate).
    databaseDriverOptions: {
      pool: { min: 0 },
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
    // Si está definido, sobrescribe el secure/sameSite de la cookie de sesión (login local http).
    ...(cookieOptions ? { cookieOptions } : {}),
  },
  modules,
})
