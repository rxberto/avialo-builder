import express, { Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import { config } from "./config/env.js";
import { routeModel, routeUnknownTask } from "./models/router.js";
import { SYSTEM_PROMPT, isOutOfScope } from "./prompts/system-base.js";
import { generationQueue } from "./queue/queue.js";
import { getJobStatus, setJobStatus } from "./queue/jobState.js";
import { jobLogEmitter, getJobLogs } from "./queue/logs.js";
import { authRouter, authenticateToken, AuthRequest, verifyAndResetCredits, verifyJwt } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { domainsRouter } from "./routes/domains.js";
import { emailRouter } from "./routes/email.js";
import { connectPrisma, prisma } from "./database/client.js";
import { listSandboxFiles, getSandboxFileContent } from "./scaffolding/fileHelper.js";
import { saveUserUpload, saveSandboxImage } from "./services/uploads.js";
import { MAX_PHOTOS_PER_REQUEST } from "./config/uploads.js";
import { runSiteAudit } from "./services/performanceAudit.js";
import { runEditAutocorrectionLoop } from "./agent/editLoop.js";
import { streamChat, type ChatMessage } from "./agent/client.js";
import { buildAssistantSystemPrompt } from "./prompts/assistant.js";
import { recordJobUsage } from "./agent/usageLog.js";
import { readSiteConfig, applySiteConfig } from "./services/applyConfig.js";
import { cleanupUserSite } from "./services/siteCleanup.js";
import { creditsForPlan, nextCreditsResetDate, isAssignablePlan } from "./config/plans.js";
import { stripe, priceIdForPlan, planFromPriceId, PLAN_MONTHLY_AMOUNT, STRIPE_AUTOMATIC_TAX } from "./config/stripe.js";
import { redisConnection } from "./config/redis.js";
import { initObservability, logger, captureError } from "./config/observability.js";
import { pinoHttp } from "pino-http";

// Inicializar Sentry/logging lo antes posible.
initObservability("avialo-api");

const app = express();
const PORT = config.server.port;

// Detrás de Traefik/reverse proxy: confiar en el primer salto para que req.ip refleje
// la IP real del cliente (X-Forwarded-For) y el rate limiting funcione por usuario.
app.set("trust proxy", 1);

// Cabeceras de seguridad. Es una API JSON, no servimos HTML, así que desactivamos CSP.
app.use(helmet({ contentSecurityPolicy: false }));

// Logging estructurado de peticiones (omitimos health y SSE para reducir ruido).
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === "/health" || (req.url?.includes("/logs") ?? false),
  },
}));

// Limitador estricto para superficies sensibles a fuerza bruta (login/registro/oauth).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Inténtalo de nuevo en unos minutos." },
});

// Limitador global generoso contra floods (excluye el webhook de Stripe, ya registrado antes).
const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Límite de peticiones excedido. Espera un momento." },
});

// Instancia única de Stripe (compartida con el panel admin vía config/stripe.ts).

// Allowlist de orígenes CORS. Solo se reflejan orígenes explícitamente permitidos.
// Configurable vía CORS_ORIGINS (lista separada por comas); por defecto FRONTEND_URL + localhost dev.
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || `${process.env.FRONTEND_URL || "http://localhost:5173"},http://localhost:5173`)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

app.use((req: Request, res: Response, next: any) => {
  const origin = req.headers.origin;
  // Reflejar la cabecera SOLO si el origen está en la allowlist.
  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    // Preflight no permitido si el origen no está autorizado
    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).end();
    }
    return res.status(200).end();
  }
  next();
});

// ============================================
// STRIPE WEBHOOK — debe registrarse ANTES de express.json()
// porque la verificación de firma requiere el cuerpo crudo (raw body).
// ============================================
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Aplica el estado de una suscripción a la cuenta del usuario.
 * Activa el plan (créditos + fechas) o lo revoca (plan = "none").
 */
async function applySubscriptionState(params: {
  userId?: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan: string; // "none" para revocar, o el webType para activar
  // Si es false, activa/cambia el plan SIN resetear los créditos (para evitar regalar
  // créditos en eventos subscription.updated incidentales donde el plan no cambia).
  resetCredits?: boolean;
  // Si es true, borra el stripeSubscriptionId del usuario (al eliminarse la suscripción).
  clearSubscriptionId?: boolean;
}): Promise<void> {
  const { userId, stripeCustomerId, stripeSubscriptionId, plan, resetCredits = true, clearSubscriptionId = false } = params;

  // Localizar al usuario. Por id explícito si lo hay; si no, por subscription O customer
  // (con OR) para ser robustos al ORDEN de llegada de los eventos: si subscription.updated
  // llega antes de checkout.session.completed, el usuario aún no tiene el subscriptionId
  // enlazado y solo casa por customerId.
  const orClauses: Array<Record<string, string>> = [];
  if (stripeSubscriptionId) orClauses.push({ stripeSubscriptionId });
  if (stripeCustomerId) orClauses.push({ stripeCustomerId });
  const where = userId ? { id: userId } : orClauses.length ? { OR: orClauses } : null;

  if (!where) {
    console.warn("⚠️ [STRIPE] Evento sin identificador de usuario resoluble. Ignorado.");
    return;
  }

  const data: Record<string, unknown> = { plan };
  if (stripeCustomerId) data.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId) data.stripeSubscriptionId = stripeSubscriptionId;
  if (clearSubscriptionId) data.stripeSubscriptionId = null;

  if (plan === "none") {
    // Revocación: no tocamos créditos, solo bloqueamos el acceso al gating de plan
    console.log("🔒 [STRIPE] Revocando plan (suscripción no activa).");
  } else if (resetCredits) {
    data.aiCredits = creditsForPlan(plan);
    data.creditsResetDate = nextCreditsResetDate();
    console.log(`✅ [STRIPE] Activando plan "${plan}" con ${data.aiCredits} créditos.`);
  } else {
    console.log(`ℹ️ [STRIPE] Sincronizando plan "${plan}" sin tocar créditos (sin cambio de plan).`);
  }

  await prisma.user.updateMany({ where: where as any, data: data as any });
}

/**
 * Fija como predeterminado el método de pago capturado en una sesión de Checkout en modo `setup`.
 * Lo aplica al customer (facturas futuras) y a su suscripción activa (cobros de la suscripción).
 */
async function setDefaultPaymentMethodFromSetup(
  session: Stripe.Checkout.Session,
  customerId?: string
): Promise<void> {
  if (!stripe || !customerId) return;
  const setupIntentId = typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id;
  if (!setupIntentId) return;

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const pm = typeof setupIntent.payment_method === "string"
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id;
  if (!pm) return;

  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm } });

  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (user?.stripeSubscriptionId) {
    await stripe.subscriptions.update(user.stripeSubscriptionId, { default_payment_method: pm }).catch(() => {});
  }
  console.log(`💳 [STRIPE] Método de pago predeterminado actualizado para customer ${customerId}.`);
}

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response): Promise<any> => {
  if (!stripe || !stripeWebhookSecret) {
    console.error("❌ [STRIPE] Webhook recibido pero Stripe/STRIPE_WEBHOOK_SECRET no está configurado.");
    return res.status(503).json({ error: "Webhook no configurado." });
  }

  const signature = req.headers["stripe-signature"];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, stripeWebhookSecret);
  } catch (err: any) {
    console.error("❌ [STRIPE] Firma de webhook inválida:", err.message);
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  // Idempotencia: si ya procesamos este evento, devolvemos 200 sin reejecutar
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (e) {
    // Violación de clave única => evento ya procesado (replay). Confirmamos y salimos.
    console.log(`🔁 [STRIPE] Evento ${event.id} ya procesado anteriormente. Ignorado (replay-safe).`);
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (session.mode === "setup") {
          // Actualización del método de pago: fijar la nueva tarjeta como predeterminada.
          await setDefaultPaymentMethodFromSetup(session, customerId);
          break;
        }

        // mode === "subscription": activación del plan tras la compra inicial.
        const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : undefined;
        const plan = session.metadata?.webType || "dinamica";
        await applySubscriptionState({
          userId: Number.isNaN(userId as number) ? undefined : userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          plan,
        });

        // El Customer lo crea Checkout al completar el pago (ya no se pre-crea). Le añadimos
        // el nombre fiscal y el NIF/CIF de la empresa (best-effort) para facturas correctas.
        if (customerId && (session.metadata?.companyName || session.metadata?.cif)) {
          await stripe.customers.update(customerId, {
            name: session.metadata?.companyName || undefined,
            metadata: { userId: session.metadata?.userId ?? "", cif: session.metadata?.cif ?? "" },
          }).catch((e: any) => console.warn("⚠️ [STRIPE] No se pudo completar datos del customer:", e.message));
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        // Mantenemos el acceso mientras Stripe da por buena/recuperable la suscripción.
        // `past_due` = pago de renovación fallido pero EN reintento (dunning): conservamos el
        // acceso para no expulsar al cliente por un fallo transitorio de tarjeta. La revocación
        // solo llega en estados terminales (unpaid/canceled/incomplete_expired).
        const keepAccess = ["active", "trialing", "past_due"].includes(sub.status);
        if (keepAccess) {
          // Derivar el plan del precio actual (cubre upgrades/downgrades vía change-plan).
          const priceId = sub.items?.data?.[0]?.price?.id;
          const plan = planFromPriceId(priceId);
          if (plan) {
            // Solo reseteamos créditos si el plan REALMENTE cambia (evita regalar créditos
            // en eventos subscription.updated incidentales, p. ej. al pasar a past_due). El
            // reseteo por renovación lo gestiona invoice.paid.
            const existing = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
            const planChanged = !existing || existing.plan !== plan;
            await applySubscriptionState({
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              plan,
              resetCredits: planChanged,
            });
          } else {
            console.warn(`⚠️ [STRIPE] subscription.updated activa con price desconocido (${priceId}). Sin cambio de plan.`);
          }
        } else {
          // unpaid/canceled/incomplete_expired/incomplete => revocar acceso al gating de plan.
          await applySubscriptionState({ stripeCustomerId: customerId, stripeSubscriptionId: sub.id, plan: "none" });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscriptionState({
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          stripeSubscriptionId: sub.id,
          plan: "none",
          clearSubscriptionId: true,
        });
        break;
      }

      case "invoice.paid": {
        // Renovación mensual: reponer los créditos del plan vigente. Solo en el ciclo de
        // renovación (no en la factura inicial, que ya activó checkout.session.completed).
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === "subscription_cycle") {
          // El price del line item vive en `price` (API antigua) o en `pricing.price_details.price`.
          const line: any = invoice.lines?.data?.[0];
          const priceId: string | undefined = line?.price?.id ?? line?.pricing?.price_details?.price;
          const plan = planFromPriceId(priceId);
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          if (plan) {
            await applySubscriptionState({ stripeCustomerId: customerId, plan });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        // No revocamos aquí: Stripe reintenta (dunning). El acceso se revoca solo cuando la
        // suscripción pase a past_due/unpaid/canceled vía customer.subscription.updated/deleted.
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`⚠️ [STRIPE] Pago de factura fallido (${invoice.id}). En reintento/dunning; sin revocar todavía.`);
        break;
      }

      default:
        // Otros eventos no requieren acción
        break;
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error(`❌ [STRIPE] Error procesando evento ${event.type}:`, err);
    // Borramos el registro de idempotencia para permitir el reintento de Stripe
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    return res.status(500).json({ error: "Error procesando el webhook." });
  }
});

app.use(express.json({ limit: "10mb" }));

// Limitador global (después del webhook de Stripe para no afectarlo).
app.use(globalLimiter);

// ============================================
// REGISTRO DE RUTAS DE AUTENTICACIÓN (NUEVO)
// ============================================
// Limitador estricto en endpoints sensibles a fuerza bruta / abuso (antes del router).
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/classify", authLimiter);
app.use("/chat", authLimiter);

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/domains", domainsRouter);
app.use("/api/email", emailRouter);

// ============================================
// HELPER DE PROPIEDAD (anti-IDOR)
// Carga un job de la cola y verifica que pertenece al usuario autenticado.
// Devuelve el job (con clientId) o null si no existe / no es del usuario.
// ============================================
async function getOwnedJob(jobId: string, userId: number) {
  const job = await generationQueue.getJob(jobId);
  if (!job) return { job: null, status: 404 as const };
  // job.data.userId se guarda al encolar. Comparamos como número.
  if (Number(job.data.userId) !== Number(userId)) {
    // No revelamos existencia a usuarios ajenos — devolvemos 404
    return { job: null, status: 404 as const };
  }
  return { job, status: 200 as const };
}

// ============================================
// ENDPOINTS DE SALUD Y UTILIDADES
// ============================================

app.get("/health", async (_req: Request, res: Response): Promise<any> => {
  // Comprobaciones reales de dependencias críticas (Postgres + Redis).
  const checks: Record<string, "ok" | "down"> = { postgres: "down", redis: "down" };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = "ok";
  } catch (e) {
    captureError(e, { check: "postgres-health" });
  }

  try {
    const pong = await redisConnection.ping();
    if (pong === "PONG") checks.redis = "ok";
  } catch (e) {
    captureError(e, { check: "redis-health" });
  }

  const healthy = checks.postgres === "ok" && checks.redis === "ok";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: "avialo-builder-api",
    version: "2.0.0",
    checks,
    stripe: stripe ? "configured" : "not_configured",
    timestamp: new Date().toISOString(),
  });
});

// Endpoints internos/diagnósticos: ahora requieren JWT (antes públicos y abusables).
app.get("/route/:taskType", authenticateToken as any, async (req: Request, res: Response) => {
  const result = await routeModel(req.params.taskType);
  res.json(result);
});

app.post("/classify", authenticateToken as any, async (req: Request, res: Response): Promise<any> => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Falta el campo description" });
  }
  const result = await routeUnknownTask(description);
  res.json(result);
});

app.post("/chat", authenticateToken as any, async (req: Request, res: Response): Promise<any> => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Falta el campo message" });
  }
  if (isOutOfScope(message)) {
    return res.json({
      blocked: true,
      response: "Eso está fuera de mi área. El equipo de Avialo puede ayudarte en hola@avialo.es",
    });
  }
  const routing = await routeModel("chat_support");
  res.json({
    blocked: false,
    routing,
    systemPromptLength: SYSTEM_PROMPT.length,
    message: `Mensaje en scope — se procesaría con ${routing.modelId}`,
  });
});

// ============================================
// FASE 4 / 6 — CHECKOUT STRIPE SUBSCRIPTION
// ============================================

/**
 * POST /api/checkout
 * Crea una sesión de suscripción mensual recurrente B2B en Stripe y devuelve la URL de checkout.
 * Protegido con autenticación por token JWT.
 */
app.post("/api/checkout", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const { clientData, billingData, successUrl, cancelUrl } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }

  // Solo planes facturables canónicos. Si llega algo raro, caemos a "dinamica".
  let webType: string = clientData?.websiteArchitecture?.type || "dinamica";
  if (!["corporativa", "dinamica", "ecommerce"].includes(webType)) webType = "dinamica";

  // Sin Stripe configurado: en PRODUCCIÓN es un error duro (jamás simular un pago).
  // En desarrollo se permite un flujo de prueba explícito.
  if (!stripe) {
    if (process.env.NODE_ENV === "production") {
      console.error("❌ [CHECKOUT] Stripe no configurado en producción. Rechazando.");
      return res.status(503).json({
        error: "El sistema de pago no está disponible en este momento. Inténtalo de nuevo más tarde.",
      });
    }
    console.warn("⚠️  [CHECKOUT] Stripe no configurado (modo desarrollo). Devolviendo sesión de prueba.");
    return res.json({
      sessionId: `dev_session_${Date.now()}`,
      url: null,
      dev: true,
      message: "Stripe no configurado. Flujo de prueba SOLO en desarrollo.",
    });
  }

  try {
    // Reutilizar el customer de Stripe del usuario (evita duplicados). Si no existe, crearlo y persistirlo.
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!dbUser) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // SEGURIDAD DE COBRO: si el usuario ya tiene una suscripción vigente, NO abrimos un
    // segundo Checkout (evita doble suscripción / doble cobro). Para upgrades/downgrades
    // se usa /api/billing/change-plan (prorrateo). Si la suscripción ya no existe o está
    // cerrada en Stripe, seguimos y dejamos que contrate una nueva.
    if (dbUser.stripeSubscriptionId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(dbUser.stripeSubscriptionId);
        if (["active", "trialing", "past_due"].includes(existingSub.status)) {
          return res.status(409).json({
            error: "Ya tienes una suscripción activa. Cambia de plan desde Facturación.",
            alreadySubscribed: true,
          });
        }
      } catch {
        // La suscripción ya no existe en Stripe: continuar y permitir contratar una nueva.
      }
    }

    // Price ID fijo del plan (creado con `npm run stripe:setup`). Sin él no se puede cobrar.
    const priceId = priceIdForPlan(webType);
    if (!priceId) {
      console.error(`❌ [CHECKOUT] Price ID no configurado para el plan "${webType}". Ejecuta 'npm run stripe:setup'.`);
      return res.status(503).json({ error: "El sistema de pago no está configurado correctamente. Inténtalo más tarde." });
    }

    // El cliente de Stripe se crea SOLO cuando el pago se completa. NO lo pre-creamos aquí:
    // así, si el usuario abre el Checkout pero no paga, no queda ningún cliente "fantasma" en
    // Stripe. En modo suscripción, Checkout crea el Customer al completar el pago y lo
    // recibimos en el webhook checkout.session.completed (que persiste stripeCustomerId).
    // Solo reutilizamos un customer si YA existe (de un pago anterior correcto).
    const customerId = dbUser.stripeCustomerId || undefined;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      // dahlia (2026-03-25) renombró el ui_mode: "embedded" → "embedded_page" (mismo modo
      // de página embebida con client_secret + initEmbeddedCheckout en el front).
      ui_mode: "embedded_page" as any,
      // NO pasamos payment_method_types: dejamos que Stripe muestre los métodos elegibles.
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      return_url: successUrl || `${process.env.FRONTEND_URL || "http://localhost:5173"}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: req.user.id.toString(),
        webType,
        companyName: billingData?.companyName ?? "",
        cif: billingData?.cif ?? "",
      },
    };

    if (customerId) {
      // Cliente ya existente (pago previo): reutilizarlo para no duplicar.
      sessionParams.customer = customerId;
    } else {
      // Cliente nuevo: prerelleno el email; Stripe crea el Customer al completar el pago.
      sessionParams.customer_email = req.user.email;
    }

    // IVA automático (Stripe Tax). Los precios son IVA incluido; Stripe desglosa el 21% en la
    // factura. Requiere dirección del cliente (la recogemos) y, para B2B, el NIF/CIF (reverse
    // charge intracomunitario). Solo cuando STRIPE_AUTOMATIC_TAX=true para no romper el cobro.
    if (STRIPE_AUTOMATIC_TAX) {
      sessionParams.automatic_tax = { enabled: true };
      sessionParams.billing_address_collection = "required";
      sessionParams.tax_id_collection = { enabled: true };
      // customer_update solo aplica a un customer ya existente; si es nuevo, Stripe lo crea
      // con la dirección recogida en el Checkout.
      if (customerId) sessionParams.customer_update = { address: "auto", name: "auto" };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`💳 Sesión de suscripción Stripe creada (Embedded): ${session.id}`);
    return res.json({ sessionId: session.id, clientSecret: session.client_secret });

  } catch (error: any) {
    console.error("❌ Error creando sesión de suscripción Stripe:", error);
    return res.status(500).json({ error: "Error al crear sesión de pago.", details: error.message });
  }
});

/**
 * POST /api/billing/portal
 * Crea una sesión del Customer Portal de Stripe para que el usuario gestione su
 * suscripción (método de pago, facturas, cancelación). Protegido con JWT.
 */
app.post("/api/billing/portal", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }
  if (!stripe) {
    return res.status(503).json({ error: "El sistema de pago no está disponible." });
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!dbUser?.stripeCustomerId) {
      return res.status(400).json({ error: "No existe una suscripción asociada a esta cuenta." });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard`,
    });

    return res.json({ url: portal.url });
  } catch (error: any) {
    console.error("❌ Error creando sesión del portal de facturación:", error);
    return res.status(500).json({ error: "Error al abrir el portal de facturación.", details: error.message });
  }
});

/**
 * GET /api/billing/invoices
 * Recupera el historial real de facturas del usuario directamente desde Stripe.
 * Protegido con JWT.
 */
app.get("/api/billing/invoices", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }
  if (!stripe) {
    return res.status(503).json({ error: "El sistema de pago no está disponible." });
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!dbUser?.stripeCustomerId) {
      return res.json({ invoices: [] });
    }

    const stripeInvoices = await stripe.invoices.list({
      customer: dbUser.stripeCustomerId,
      limit: 10,
    });

    const formattedInvoices = stripeInvoices.data.map((inv) => ({
      id: inv.number || inv.id,
      date: new Date(inv.created * 1000).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      amount: `${(inv.amount_paid / 100).toFixed(2).replace(".", ",")} €`,
      status: inv.status === "paid" ? "Pagada" : inv.status === "open" ? "Pendiente" : "Cancelada",
      pdf: inv.invoice_pdf || null,
    }));

    return res.json({ invoices: formattedInvoices });
  } catch (error: any) {
    console.error("❌ Error recuperando facturas reales de Stripe:", error);
    return res.status(500).json({ error: "Error al recuperar facturas.", details: error.message });
  }
});

/**
 * GET /api/billing/subscription
 * Estado REAL de la suscripción del usuario (leído en vivo de Stripe). Protegido con JWT.
 */
app.get("/api/billing/subscription", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  if (!stripe) return res.status(503).json({ error: "El sistema de pago no está disponible." });

  const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!dbUser?.stripeSubscriptionId) {
    return res.json({ active: false, plan: dbUser?.plan || "none" });
  }

  try {
    const sub = await stripe.subscriptions.retrieve(dbUser.stripeSubscriptionId, {
      expand: ["default_payment_method", "items.data.price"],
    });
    const item = sub.items?.data?.[0];
    const price = item?.price;
    const plan = planFromPriceId(price?.id) || dbUser.plan || "none";

    const pmObj: any = sub.default_payment_method;
    const paymentMethod = pmObj && typeof pmObj !== "string" && pmObj.card
      ? { brand: pmObj.card.brand, last4: pmObj.card.last4 }
      : null;

    // current_period_end vive en la suscripción o (en API recientes) en el item.
    const periodEnd = (sub as any).current_period_end ?? (item as any)?.current_period_end ?? null;

    return res.json({
      active: ["active", "trialing", "past_due"].includes(sub.status),
      plan,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: periodEnd ? periodEnd * 1000 : null,
      amount: price?.unit_amount ?? PLAN_MONTHLY_AMOUNT[plan] ?? null,
      currency: price?.currency || "eur",
      interval: price?.recurring?.interval || "month",
      paymentMethod,
    });
  } catch (error: any) {
    // La suscripción ya no existe en Stripe (borrada) → reflejar sin suscripción.
    console.warn("⚠️ [BILLING] No se pudo recuperar la suscripción:", error.message);
    return res.json({ active: false, plan: dbUser.plan || "none" });
  }
});

/**
 * POST /api/billing/change-plan  { plan }
 * Cambia de plan in-app con prorrateo. El webhook subscription.updated reconcilia plan+créditos.
 * Si el usuario no tiene suscripción activa, responde 409 { needsCheckout } para abrir Checkout.
 */
app.post("/api/billing/change-plan", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  if (!stripe) return res.status(503).json({ error: "El sistema de pago no está disponible." });

  const { plan } = req.body || {};
  if (!isAssignablePlan(plan) || plan === "none") {
    return res.status(400).json({ error: "Plan no válido." });
  }
  const priceId = priceIdForPlan(plan);
  if (!priceId) return res.status(503).json({ error: "Ese plan no está disponible para cobro." });

  const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!dbUser?.stripeSubscriptionId) {
    return res.status(409).json({ error: "No tienes una suscripción activa.", needsCheckout: true });
  }

  try {
    const sub = await stripe.subscriptions.retrieve(dbUser.stripeSubscriptionId);
    if (["canceled", "incomplete_expired"].includes(sub.status)) {
      return res.status(409).json({ error: "Tu suscripción no está activa.", needsCheckout: true });
    }
    const item = sub.items?.data?.[0];
    if (!item?.id) return res.status(409).json({ error: "Suscripción sin línea facturable.", needsCheckout: true });
    if (item.price?.id === priceId) return res.status(400).json({ error: "Ya tienes ese plan." });

    await stripe.subscriptions.update(dbUser.stripeSubscriptionId, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false, // si estaba marcada para cancelar, la reactivamos al cambiar
      // El IVA del prorrateo y de las renovaciones se calcula con Stripe Tax (precios IVA incluido).
      ...(STRIPE_AUTOMATIC_TAX ? { automatic_tax: { enabled: true } } : {}),
    });
    return res.json({ success: true, plan });
  } catch (error: any) {
    console.error("❌ [BILLING] Error al cambiar de plan:", error);
    return res.status(500).json({ error: "No se pudo cambiar de plan.", details: error.message });
  }
});

/**
 * POST /api/billing/cancel — programa la cancelación al final del periodo (mantiene acceso).
 */
app.post("/api/billing/cancel", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  if (!stripe) return res.status(503).json({ error: "El sistema de pago no está disponible." });

  const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!dbUser?.stripeSubscriptionId) return res.status(400).json({ error: "No tienes una suscripción activa." });

  try {
    await stripe.subscriptions.update(dbUser.stripeSubscriptionId, { cancel_at_period_end: true });
    return res.json({ success: true, cancelAtPeriodEnd: true });
  } catch (error: any) {
    console.error("❌ [BILLING] Error al cancelar:", error);
    return res.status(500).json({ error: "No se pudo cancelar la suscripción.", details: error.message });
  }
});

/**
 * POST /api/billing/resume — deshace una cancelación programada.
 */
app.post("/api/billing/resume", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  if (!stripe) return res.status(503).json({ error: "El sistema de pago no está disponible." });

  const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!dbUser?.stripeSubscriptionId) return res.status(400).json({ error: "No tienes una suscripción." });

  try {
    await stripe.subscriptions.update(dbUser.stripeSubscriptionId, { cancel_at_period_end: false });
    return res.json({ success: true, cancelAtPeriodEnd: false });
  } catch (error: any) {
    console.error("❌ [BILLING] Error al reanudar:", error);
    return res.status(500).json({ error: "No se pudo reanudar la suscripción.", details: error.message });
  }
});

/**
 * POST /api/billing/update-payment-method
 * Crea una sesión de Checkout en modo `setup` (embedded) para capturar una nueva tarjeta.
 * El webhook checkout.session.completed (mode=setup) la fija como predeterminada.
 */
app.post("/api/billing/update-payment-method", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  if (!stripe) return res.status(503).json({ error: "El sistema de pago no está disponible." });

  const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!dbUser?.stripeCustomerId) return res.status(400).json({ error: "No tienes un perfil de facturación todavía." });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      // dahlia (2026-03-25) renombró el ui_mode: "embedded" → "embedded_page" (mismo modo
      // de página embebida con client_secret + initEmbeddedCheckout en el front).
      ui_mode: "embedded_page" as any,
      customer: dbUser.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/billing?card=updated&session_id={CHECKOUT_SESSION_ID}`,
      metadata: { userId: req.user.id.toString() },
    });
    return res.json({ clientSecret: session.client_secret });
  } catch (error: any) {
    console.error("❌ [BILLING] Error al iniciar actualización de tarjeta:", error);
    return res.status(500).json({ error: "No se pudo iniciar la actualización de la tarjeta.", details: error.message });
  }
});

/**
 * GET /api/billing/verify-session?session_id=...
 * Verifica en servidor el resultado de una sesión de Checkout (sin confiar en el cliente).
 * Solo devuelve datos si la sesión pertenece al usuario autenticado.
 */
app.get("/api/billing/verify-session", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });
  if (!stripe) return res.status(503).json({ error: "El sistema de pago no está disponible." });

  const sessionId = String(req.query.session_id || "");
  if (!sessionId.startsWith("cs_")) return res.status(400).json({ error: "session_id no válido." });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userId !== String(req.user.id)) {
      return res.status(403).json({ error: "Esta sesión no pertenece a tu cuenta." });
    }
    return res.json({
      paid: session.payment_status === "paid" || session.status === "complete",
      plan: session.metadata?.webType || null,
      status: session.status,
      mode: session.mode,
    });
  } catch (error: any) {
    console.error("❌ [BILLING] Error al verificar la sesión:", error);
    return res.status(500).json({ error: "No se pudo verificar la sesión." });
  }
});

// ============================================
// AUDITORÍA DE RENDIMIENTO REAL — FASE 5
// ============================================

/**
 * GET /api/site/audit
 * Devuelve métricas REALES de rendimiento/SEO del sitio desplegado del usuario (PageSpeed
 * Insights). Si no hay sitio desplegado o no es accesible, responde { available:false }.
 * ?refresh=1 ignora la caché. Protegido con JWT.
 */
app.get("/api/site/audit", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!dbUser) return res.status(404).json({ error: "Usuario no encontrado." });

    if (dbUser.siteStatus !== "deployed" || !dbUser.siteDomain) {
      return res.json({ available: false, reason: "no_site" });
    }

    // El dominio guardado es p.ej. "negocio.avialo.app" → auditamos su versión HTTPS.
    const domain = dbUser.siteDomain.replace(/^https?:\/\//, "");
    const url = `https://${domain}`;
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";

    const scores = await runSiteAudit(url, refresh);
    return res.json({ available: true, scores });
  } catch (error: any) {
    // No es un 500 "duro": el front muestra un estado de "no disponible" con el motivo.
    return res.json({ available: false, reason: "audit_failed", message: error.message });
  }
});

// ============================================
// SUBIDA DE IMÁGENES DEL NEGOCIO — FASE 4
// ============================================

/**
 * POST /api/uploads
 * Recibe las fotos propias del negocio (data URLs base64) durante el onboarding y las
 * persiste en el almacén del usuario. Devuelve los ids para incluirlos en el onboarding.
 * Protegido con JWT.
 */
app.post("/api/uploads", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  // Aceptamos tanto un array `images` como una sola `image` (data URL base64).
  const images: unknown[] = Array.isArray(req.body?.images)
    ? req.body.images
    : req.body?.image
      ? [req.body.image]
      : [];

  if (images.length === 0) {
    return res.status(400).json({ error: "No se recibió ninguna imagen." });
  }
  if (images.length > MAX_PHOTOS_PER_REQUEST) {
    return res.status(400).json({ error: `Máximo ${MAX_PHOTOS_PER_REQUEST} fotos por subida.` });
  }

  try {
    const photos: { id: string }[] = [];
    for (const img of images) {
      const saved = await saveUserUpload(req.user.id, img as string);
      photos.push(saved);
    }
    return res.status(201).json({ photos });
  } catch (error: any) {
    // Los errores de validación de decodeDataUrlImage llevan un mensaje claro para el usuario.
    return res.status(400).json({ error: error.message || "No se pudo procesar la imagen." });
  }
});

// ENDPOINTS DE TRABAJOS (JOBS) — FASE 2 + 4
// ============================================

/**
 * POST /api/jobs
 * Crea y encola un trabajo de generación.
 * Protegido con token JWT.
 */
app.post("/api/jobs", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const body = req.body;

  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }

  let businessName: string, webType: string, sector: string, city: string;
  let primaryColor: string = "#1a56db";
  let pages: string[] = ["Inicio", "Contacto"];
  let fullClientData: any = null;

  if (body.businessContext) {
    // Formato onboarding completo (Fase 4)
    fullClientData = body;
    businessName = body.businessContext?.name || "";
    sector       = body.businessContext?.industry || "";
    city         = body.businessContext?.city || "";
    webType      = body.websiteArchitecture?.type || "corporativa";
    primaryColor = body.designAestheticPreference?.brandPrimaryHex || "#1a56db";
    pages        = body.websiteArchitecture?.siteNavigationOrder || ["Inicio", "Contacto"];
  } else {
    // Formato plano (compatibilidad con tests)
    ({ businessName, webType, sector, city } = body);
    if (body.primaryColor) primaryColor = body.primaryColor;
    if (body.pages) pages = body.pages;
  }

  if (!businessName || !webType || !sector || !city) {
    return res.status(400).json({
      error: "Faltan campos obligatorios: businessName, webType, sector, city",
    });
  }

  const clientId = `${businessName
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")}-${Date.now()}`;

  try {
    // Consultar si el usuario ya tiene un sitio activo o en proceso de generación (con reseteo de créditos automático)
    const dbUser = await verifyAndResetCredits(req.user.id);
    if (!dbUser) {
      return res.status(404).json({ error: "Usuario no encontrado en la base de datos." });
    }

    // CONTROL DE CRÉDITOS DE IA / SUSCRIPCIÓN ENTERPRISE
    // Evita el abuso de solicitudes de generación por usuarios sin plan de pago activo
    if (!dbUser.plan || dbUser.plan === "none") {
      return res.status(402).json({
        error: "Suscripción activa requerida. Por favor, selecciona un plan B2B y completa tu facturación antes de iniciar la generación de tu sitio web.",
        code: "SUBSCRIPTION_REQUIRED"
      });
    }

    // Control de Límite de Créditos IA
    if (dbUser.aiCredits < 500) {
      return res.status(402).json({
        error: "Créditos IA insuficientes. Necesitas al menos 500 créditos para generar una nueva web completa. Por favor, actualiza tu plan.",
        code: "INSUFFICIENT_CREDITS"
      });
    }


    // Permitir re-generación, bloqueando únicamente si hay una cola activa real en ejecución en Redis
    if (dbUser.siteStatus && !["none", "failed", "deployed"].includes(dbUser.siteStatus) && dbUser.siteJobId) {
      const activeJob = await generationQueue.getJob(dbUser.siteJobId);
      if (activeJob) {
        const state = await activeJob.getState();
        if (["active", "waiting"].includes(state)) {
          return res.status(400).json({
            error: "Tu cuenta B2B ya cuenta con un proceso de generación activo y en ejecución en este momento. Por favor, espera a que finalice.",
            siteStatus: dbUser.siteStatus
          });
        }
      }
    }

    // Guarda atómica (race-safe): actualizamos el siteStatus a 'pending' para evitar doble encolado concurrente.
    // Los créditos se descontarán de forma exacta al finalizar el job (vía recordJobUsage).
    const guard = await prisma.user.updateMany({
      where: {
        id: req.user.id,
        // Solo permite si no está ya generating o pending en este instante
        siteStatus: { notIn: ["pending", "generating"] }
      },
      data: { siteStatus: "pending" },
    });

    if (guard.count === 0 && dbUser.siteStatus !== "none" && dbUser.siteStatus !== "failed" && dbUser.siteStatus !== "deployed") {
      return res.status(409).json({
        error: "Ya hay una petición de generación en curso.",
        code: "CONCURRENT_REQUEST",
      });
    }

    // Encolar el job. Si falla, REVERTIMOS el estado.
    let job;
    try {
      job = await generationQueue.add(`generation-${clientId}`, {
        clientId,
        webType,
        businessName,
        sector,
        city,
        primaryColor,
        pages,
        fullClientData,
        userId: req.user.id, // Vinculado al usuario logueado en la base de datos
      });
    } catch (enqueueErr: any) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { siteStatus: dbUser.siteStatus }, // revertir al estado anterior
      }).catch((err: any) => console.error("⚠️ Error al revertir estado tras fallo de encolado:", err));
      throw enqueueErr;
    }

    const jobId = job.id || `job-${Date.now()}`;

    await setJobStatus({
      jobId,
      state: "pending",
      progress: 0,
      updatedAt: new Date().toISOString(),
    });

    // Guardar detalles del sitio web (los créditos ya se descontaron arriba de forma atómica).
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        siteName: businessName,
        siteType: webType,
        siteDomain: body.customDomain?.trim().toLowerCase().replace(/https?:\/\//, '') || `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.avialo.app`,
        siteJobId: jobId,
        siteStatus: "pending",
      }
    }).catch((err: any) => console.error("⚠️ Error al inicializar sitio en db:", err));

    console.log(`📥 Trabajo encolado con ID: ${jobId} para cliente: ${clientId}`);

    return res.status(202).json({
      success: true,
      jobId,
      state: "pending",
      status: "pending",
      clientId,
      message: "Trabajo de generación creado y encolado correctamente.",
    });

  } catch (error: any) {
    console.error("❌ Error al crear el trabajo:", error);
    return res.status(500).json({
      error: "Error interno al crear el trabajo de generación.",
      details: error.message,
    });
  }
});

/**
 * GET /api/jobs/:id
 * Obtiene el estado actual de un trabajo.
 */
app.get("/api/jobs/:id", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;

  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }

  // Verificar propiedad antes de exponer cualquier estado
  const { job, status } = await getOwnedJob(jobId, req.user.id);
  if (!job) {
    return res.status(status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });
  }

  const jobData = await getJobStatus(jobId);
  if (!jobData) {
    // El job existe y es del usuario, pero aún no hay estado registrado
    return res.json({ jobId, status: "pending", progress: 0, previewUrl: null });
  }

  res.json({
    ...jobData,
    status:     jobData.state || "pending",
    progress:   jobData.progress ?? 0,
    previewUrl: jobData.previewUrl ?? null,
  });
});

/**
 * DELETE /api/jobs/:id
 * Elimina una generación (típicamente fallida): limpia recursos (contenedor, esquema,
 * sandbox), borra el job de la cola y resetea el sitio del usuario a "none".
 * No permite borrar un job en ejecución.
 */
app.delete("/api/jobs/:id", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const { job, status } = await getOwnedJob(jobId, req.user.id);
  if (!job) return res.status(status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });

  // No borrar mientras se está generando activamente.
  const state = await job.getState();
  if (["active", "waiting", "delayed"].includes(state)) {
    return res.status(409).json({ error: "No se puede eliminar una generación en curso. Espera a que termine." });
  }

  try {
    // Resetear el sitio del usuario (rápido) y responder YA. La limpieza de recursos
    // (contenedor Docker + esquema PG + sandbox) puede tardar; si bloqueáramos la respuesta
    // el proxy cortaría con 5xx y el navegador lo reporta como error de CORS.
    await prisma.user.updateMany({
      where: { id: req.user.id, siteJobId: jobId },
      data: { siteStatus: "none", siteJobId: null, siteName: null, siteDomain: null, siteType: null },
    }).catch((err: any) => console.error("⚠️ Error al resetear el sitio del usuario tras borrado:", err));

    res.json({ success: true, message: "Generación eliminada correctamente." });

    // Limpieza en segundo plano (best-effort).
    void (async () => {
      await cleanupUserSite(jobId).catch((e) => console.error("⚠️ Cleanup en background falló:", e));
      await job.remove().catch(() => {});
      await setJobStatus({ jobId, state: "failed", progress: 0, error: "Generación eliminada por el usuario.", updatedAt: new Date().toISOString() }).catch(() => {});
    })();
    return;
  } catch (error: any) {
    console.error("❌ Error al eliminar la generación:", error);
    return res.status(500).json({ error: "Error al eliminar la generación.", details: error.message });
  }
});

/**
 * POST /api/jobs/:id/retry
 * Reintenta una generación fallida reutilizando los datos del job original (persistidos
 * en la cola), tras limpiar los recursos del intento anterior. Encola un job nuevo.
 */
app.post("/api/jobs/:id/retry", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const { job, status } = await getOwnedJob(jobId, req.user.id);
  if (!job) return res.status(status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });

  const state = await job.getState();
  if (["active", "waiting", "delayed"].includes(state)) {
    return res.status(409).json({ error: "Ya hay una generación en curso para este sitio." });
  }

  try {
    const dbUser = await verifyAndResetCredits(req.user.id);
    if (!dbUser) return res.status(404).json({ error: "Usuario no encontrado." });
    if (!dbUser.plan || dbUser.plan === "none") {
      return res.status(402).json({ error: "Suscripción activa requerida.", code: "SUBSCRIPTION_REQUIRED" });
    }
    if (dbUser.aiCredits < 500) {
      return res.status(402).json({ error: "Créditos IA insuficientes para reintentar la generación.", code: "INSUFFICIENT_CREDITS" });
    }

    // Datos del intento original (persistidos al encolar).
    const prev = job.data;
    const businessName = prev.businessName || dbUser.siteName || "sitio";

    // Nuevo clientId para un sandbox limpio.
    const clientId = `${businessName
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "")}-${Date.now()}`;

    const newJob = await generationQueue.add(`generation-${clientId}`, {
      ...prev,
      clientId,
      userId: req.user.id,
    });

    const newJobId = newJob.id || `job-${Date.now()}`;
    await setJobStatus({ jobId: newJobId, state: "pending", progress: 0, updatedAt: new Date().toISOString() });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { siteJobId: newJobId, siteStatus: "pending" },
    }).catch((err: any) => console.error("⚠️ Error al guardar nuevo jobId en retry:", err));

    console.log(`🔁 Reintento encolado: ${jobId} → ${newJobId} (cliente ${clientId})`);
    res.status(202).json({ success: true, jobId: newJobId, state: "pending", clientId });

    // Limpiar los recursos del intento fallido en segundo plano (no bloquea la respuesta).
    void (async () => {
      await cleanupUserSite(jobId).catch((e) => console.error("⚠️ Cleanup en background (retry) falló:", e));
      await job.remove().catch(() => {});
    })();
    return;
  } catch (error: any) {
    console.error("❌ Error al reintentar la generación:", error);
    return res.status(500).json({ error: "Error al reintentar la generación.", details: error.message });
  }
});

/**
 * GET /api/jobs/:id/logs
 * Streaming SSE (Server-Sent Events) de logs y progreso en vivo.
 */
app.get("/api/jobs/:id/logs", async (req: Request, res: Response): Promise<any> => {
  const jobId = req.params.id;

  // SSE/EventSource no permite cabeceras personalizadas: el token llega por query (?token=)
  const token = (req.query.token as string) || "";
  const decoded = token ? verifyJwt(token) : null;
  if (!decoded) {
    return res.status(401).json({ error: "Token no válido o ausente para el stream SSE." });
  }

  // Verificar propiedad del job antes de emitir logs
  const ownership = await getOwnedJob(jobId, decoded.id);
  if (!ownership.job) {
    return res.status(ownership.status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });
  }

  const reqOrigin = req.headers.origin as string | undefined;
  const sseHeaders: Record<string, string> = {
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive",
  };
  // Solo reflejar el origen si está en la allowlist.
  if (reqOrigin && allowedOrigins.has(reqOrigin)) {
    sseHeaders["Access-Control-Allow-Origin"] = reqOrigin;
    sseHeaders["Access-Control-Allow-Credentials"] = "true";
    sseHeaders["Vary"] = "Origin";
  }
  res.writeHead(200, sseHeaders);

  const initialLogs = await getJobLogs(jobId);
  initialLogs.forEach((log) => {
    res.write(`event: log\ndata: ${JSON.stringify({ message: log })}\n\n`);
  });

  const currentStatus = await getJobStatus(jobId);
  if (currentStatus) {
    res.write(`event: progress\ndata: ${JSON.stringify({
      status:     currentStatus.state || "pending",
      progress:   currentStatus.progress ?? 0,
      previewUrl: currentStatus.previewUrl ?? null,
    })}\n\n`);
  }

  const logCallback = (logMessage: string) => {
    res.write(`event: log\ndata: ${JSON.stringify({ message: logMessage })}\n\n`);
  };

  const progressCallback = (progressData: any) => {
    res.write(`event: progress\ndata: ${JSON.stringify(progressData)}\n\n`);
  };

  const logEvent      = `log:${jobId}`;
  const progressEvent = `progress:${jobId}`;
  jobLogEmitter.on(logEvent, logCallback);
  jobLogEmitter.on(progressEvent, progressCallback);

  console.log(`🔌 Cliente SSE conectado para Job: ${jobId}`);

  req.on("close", () => {
    jobLogEmitter.off(logEvent, logCallback);
    jobLogEmitter.off(progressEvent, progressCallback);
    console.log(`🔌 Cliente SSE desconectado de Job: ${jobId}`);
  });
});

// ============================================
// ENDPOINTS DE INSPECCIÓN Y LECTURA DE ARCHIVOS — FASE 8
// ============================================

/**
 * GET /api/jobs/:id/files
 * Obtiene el árbol de archivos editables del sandbox.
 */
app.get("/api/jobs/:id/files", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;

  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }

  try {
    const { job, status } = await getOwnedJob(jobId, req.user.id);
    if (!job) {
      return res.status(status).json({ error: `Trabajo de generación con ID "${jobId}" no encontrado.` });
    }

    const clientId = job.data.clientId;
    if (!clientId) {
      return res.status(400).json({ error: "El trabajo no posee un identificador de cliente válido." });
    }

    const files = await listSandboxFiles(clientId);
    return res.json({ files });
  } catch (error: any) {
    console.error("❌ Error al listar archivos del sandbox:", error);
    return res.status(500).json({ error: "Error al listar archivos del sandbox.", details: error.message });
  }
});

/**
 * GET /api/jobs/:id/files/content
 * Lee un archivo específico dentro del sandbox.
 */
app.get("/api/jobs/:id/files/content", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  const filePath = req.query.path as string;

  if (!filePath) {
    return res.status(400).json({ error: "Se requiere el parámetro 'path' en la query." });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }

  try {
    const { job, status } = await getOwnedJob(jobId, req.user.id);
    if (!job) {
      return res.status(status).json({ error: `Trabajo de generación con ID "${jobId}" no encontrado.` });
    }

    const clientId = job.data.clientId;
    if (!clientId) {
      return res.status(400).json({ error: "El trabajo no posee un identificador de cliente válido." });
    }

    const content = await getSandboxFileContent(clientId, filePath);
    return res.json({ path: filePath, content });
  } catch (error: any) {
    console.error(`❌ Error al leer archivo "${filePath}" del sandbox:`, error);
    return res.status(500).json({ error: `Error al leer archivo "${filePath}".`, details: error.message });
  }
});

/**
 * POST /api/jobs/:id/upload
 * Sube una imagen al proyecto en vivo del IDE: la escribe en la carpeta pública del sandbox
 * y devuelve su ruta pública (`/avialo-uploads/<file>`) para que el cliente la mencione en
 * el siguiente prompt de edición y la IA la use en la web. Protegido con JWT.
 */
app.post("/api/jobs/:id/upload", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const image = req.body?.image;
  if (!image) return res.status(400).json({ error: "No se recibió ninguna imagen." });

  try {
    const { job, status } = await getOwnedJob(jobId, req.user.id);
    if (!job) return res.status(status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });

    const clientId = job.data.clientId;
    if (!clientId) return res.status(400).json({ error: "El trabajo no posee un identificador de cliente válido." });

    const { url } = await saveSandboxImage(clientId, image as string);
    return res.status(201).json({ url });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "No se pudo subir la imagen." });
  }
});

/**
 * POST /api/jobs/:id/ask  (FASE 6 — modo Asistente)
 * Responde preguntas del cliente sobre SU web en STREAMING de tokens (sin Docker/build).
 * Cuerpo: { message, history?: [{role,content}] }. Protegido con JWT.
 */
app.post("/api/jobs/:id/ask", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Falta el mensaje." });

  // Historial conversacional (saneado y acotado a los últimos 10 turnos).
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const history: ChatMessage[] = rawHistory
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  try {
    const dbUser = await verifyAndResetCredits(req.user.id);
    if (!dbUser) return res.status(404).json({ error: "Usuario no encontrado." });
    if (!dbUser.plan || dbUser.plan === "none") {
      return res.status(402).json({ error: "Suscripción activa requerida.", code: "SUBSCRIPTION_REQUIRED" });
    }
    if (dbUser.aiCredits < 1) {
      return res.status(402).json({ error: "Créditos IA agotados.", code: "INSUFFICIENT_CREDITS" });
    }

    const { job, status } = await getOwnedJob(jobId, req.user.id);
    if (!job) return res.status(status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });

    const system = buildAssistantSystemPrompt({
      businessName: job.data.businessName || dbUser.siteName || undefined,
      sector: job.data.sector,
      city: job.data.city,
      siteType: job.data.webType || dbUser.siteType || undefined,
      siteDomain: dbUser.siteDomain || undefined,
      plan: dbUser.plan,
    });

    // Cabeceras de streaming. X-Accel-Buffering:no evita que proxies (Traefik/nginx) lo bufericen.
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    // Nota: no hacemos flushHeaders() a propósito — así, si el proveedor falla ANTES del
    // primer token, headersSent sigue false y devolvemos un JSON 500 limpio (el catch lo hace).

    const messages: ChatMessage[] = [...history, { role: "user", content: message }];

    await streamChat(
      system,
      messages,
      (chunk) => { res.write(chunk); },
      1024,
      (u) => { recordJobUsage({ jobId, userId: req.user!.id, kind: "edit", ...u }); }
    );

    return res.end();
  } catch (error: any) {
    // Si aún no enviamos cabeceras de streaming, respondemos JSON; si ya empezó, cerramos.
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || "No se pudo procesar la pregunta." });
    }
    try { res.write(`\n\n⚠️ Se interrumpió la respuesta: ${error.message}`); } catch {}
    return res.end();
  }
});

/**
 * GET /api/jobs/:id/config  (FASE 7 — panel de configuración)
 * Devuelve la configuración editable del sitio + sus capacidades (estática vs dinámica).
 */
app.get("/api/jobs/:id/config", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const { job, status } = await getOwnedJob(jobId, req.user.id);
  if (!job) return res.status(status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });

  const clientId = job.data.clientId;
  if (!clientId) return res.status(400).json({ error: "El trabajo no posee un identificador de cliente válido." });

  try {
    const config = await readSiteConfig(clientId, job.data);
    const siteType = job.data.webType || "corporativa";
    const dynamic = siteType === "dinamica" || siteType === "ecommerce";
    return res.json({ config, capabilities: { siteType, dynamic } });
  } catch (error: any) {
    return res.status(500).json({ error: "No se pudo leer la configuración.", details: error.message });
  }
});

/**
 * PUT /api/jobs/:id/config  (FASE 7)
 * Aplica cambios de configuración del cliente de forma DETERMINISTA (sin IA) y recompila.
 * Responde 202; el IDE sondea el estado del job para recargar el preview.
 */
app.put("/api/jobs/:id/config", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  if (!req.user) return res.status(401).json({ error: "No autorizado." });

  const patch = req.body?.config;
  if (!patch || typeof patch !== "object") {
    return res.status(400).json({ error: "Falta el objeto 'config'." });
  }

  try {
    const dbUser = await verifyAndResetCredits(req.user.id);
    if (!dbUser) return res.status(404).json({ error: "Usuario no encontrado." });
    if (!dbUser.plan || dbUser.plan === "none") {
      return res.status(402).json({ error: "Suscripción activa requerida.", code: "SUBSCRIPTION_REQUIRED" });
    }

    const { job, status } = await getOwnedJob(jobId, req.user.id);
    if (!job) return res.status(status).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });
    const clientId = job.data.clientId;
    if (!clientId) return res.status(400).json({ error: "El trabajo no posee un identificador de cliente válido." });

    // Marcar estado y responder ya; la recompilación corre en segundo plano (no bloquea).
    await setJobStatus({ jobId, state: "generating", progress: 20, updatedAt: new Date().toISOString() });
    res.status(202).json({ success: true, message: "Aplicando configuración…" });

    applySiteConfig(jobId, clientId, job.data, patch, req.user.id).catch((err) => {
      console.error("❌ Fallo aplicando configuración del sitio:", err);
    });
    return;
  } catch (error: any) {
    if (!res.headersSent) return res.status(500).json({ error: "No se pudo aplicar la configuración.", details: error.message });
  }
});

/**
 * POST /api/jobs/:id/edit
 * Inicia el proceso asíncrono de edición por IA de un sitio web.
 */
app.post("/api/jobs/:id/edit", authenticateToken as any, async (req: AuthRequest, res: Response): Promise<any> => {
  const jobId = req.params.id;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Falta la instrucción de edición ('prompt')." });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autorizado." });
  }

  try {
    const dbUser = await verifyAndResetCredits(req.user.id);
    if (!dbUser) {
      return res.status(404).json({ error: "Usuario no encontrado en la base de datos." });
    }

    // CONTROL DE CRÉDITOS DE IA / SUSCRIPCIÓN ENTERPRISE PARA EDICIONES
    if (!dbUser.plan || dbUser.plan === "none") {
      return res.status(402).json({
        error: "Suscripción activa requerida. Por favor, selecciona un plan B2B y completa tu facturación antes de solicitar ediciones de IA en tu sitio.",
        code: "SUBSCRIPTION_REQUIRED"
      });
    }

    if (dbUser.aiCredits < 1) {
      return res.status(402).json({
        error: "Créditos IA agotados. Has consumido todos los tokens de tu plan actual. Por favor, realiza un upgrade para continuar editando tu web.",
        code: "INSUFFICIENT_CREDITS"
      });
    }

    const { job, status } = await getOwnedJob(jobId, req.user.id);
    if (!job) {
      return res.status(status).json({ error: `Trabajo de generación con ID "${jobId}" no encontrado.` });
    }

    const clientId = job.data.clientId;
    if (!clientId) {
      return res.status(400).json({ error: "El trabajo no posee un identificador de cliente válido." });
    }

    // Identificar si el cambio es complejo o simple para deducción de créditos dinámica y enrutamiento LLM.
    const isComplexEdit = prompt.length > 80 || /crea|añad|nuev|reestructur|base de datos|complej|página/i.test(prompt);
    const preferredModel = isComplexEdit ? "claude" : "deepseek";
    
    // Ya no hacemos descuento atómico previo aquí, el coste dinámico se calcula al finalizar
    // el trabajo a través de recordJobUsage.
    
    // Verificamos de forma segura que el usuario no esté en otro proceso que chocaría
    const guard = await prisma.user.updateMany({
      where: { 
        id: req.user.id, 
        siteStatus: { notIn: ["generating", "pending"] },
        aiCredits: { gte: 1 } // Requiere al menos 1 crédito para empezar
      },
      data: { siteStatus: "generating" }
    });

    if (guard.count === 0) {
      return res.status(409).json({
        error: "Hay una petición en curso o no tienes suficientes créditos.",
        code: "CONCURRENT_REQUEST_OR_FUNDS"
      });
    }

    const currentStatus = await getJobStatus(jobId);
    await setJobStatus({
      jobId,
      state: "generating",
      progress: 20,
      previewUrl: currentStatus?.previewUrl,
      port: currentStatus?.port,
      updatedAt: new Date().toISOString()
    });

    // Iniciar el bucle de edición en segundo plano (asíncrono)
    runEditAutocorrectionLoop(jobId, clientId, prompt, req.user.id, preferredModel).catch((err) => {
      console.error("❌ Fallo crítico en el bucle de edición de fondo:", err);
    });

    return res.json({
      success: true,
      message: "Proceso asíncrono de edición por IA iniciado de forma exitosa.",
      jobId
    });

  } catch (error: any) {
    console.error("❌ Error al iniciar el proceso de edición:", error);
    return res.status(500).json({ error: "Error interno al iniciar el proceso de edición.", details: error.message });
  }
});

// Tarea automática de segundo plano para reseteo automático de créditos (cron job equivalente)
async function runBackgroundCreditsReset() {
  try {
    const now = new Date();
    // Buscar usuarios cuya fecha de reinicio haya expirado
    const usersToReset = await prisma.user.findMany({
      where: {
        creditsResetDate: {
          lt: now
        }
      }
    });

    for (const u of usersToReset) {
      const plan = u.plan || "none";
      // Fuente única: creditsForPlan (antes había un mapa duplicado con valores distintos
      // a los de activación, así que el reseteo mensual daba MENOS créditos de los debidos).
      const maxCredits = creditsForPlan(plan);

      await prisma.user.update({
        where: { id: u.id },
        data: {
          aiCredits: maxCredits,
          creditsResetDate: nextCreditsResetDate()
        }
      });
      console.log(`🔄 [CRON INTERNO] Créditos reseteados para el usuario ${u.email} al máximo del plan "${plan}": ${maxCredits} créditos.`);
    }
  } catch (error) {
    console.error("⚠️ [CRON INTERNO] Error al ejecutar el reseteo de créditos en segundo plano:", error);
  }
}

// Ejecutar cada 6 horas para chequear si algún mes ha expirado
setInterval(runBackgroundCreditsReset, 6 * 60 * 60 * 1000);

// Manejador de errores global: registra en Sentry/log y responde de forma genérica.
// (4 argumentos => Express lo trata como middleware de errores.)
app.use((err: any, req: Request, res: Response, _next: any) => {
  captureError(err, { path: req.path, method: req.method });
  if (res.headersSent) return;
  res.status(500).json({ error: "Error interno del servidor." });
});

// Capturar fallos no atrapados para no morir en silencio.
process.on("unhandledRejection", (reason) => captureError(reason, { kind: "unhandledRejection" }));
process.on("uncaughtException", (err) => captureError(err, { kind: "uncaughtException" }));

async function startServer() {
  // Conectar Prisma a PostgreSQL antes de escuchar peticiones
  await connectPrisma();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "Servidor Avialo v2 (API) iniciado");
  });
}

startServer();
