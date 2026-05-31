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
import { runEditAutocorrectionLoop } from "./agent/editLoop.js";
import { creditsForPlan, nextCreditsResetDate } from "./config/plans.js";
import { stripe } from "./config/stripe.js";
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
}): Promise<void> {
  const { userId, stripeCustomerId, stripeSubscriptionId, plan } = params;

  // Localizar al usuario por id explícito, por customer o por subscription
  const where = userId
    ? { id: userId }
    : stripeSubscriptionId
      ? { stripeSubscriptionId }
      : stripeCustomerId
        ? { stripeCustomerId }
        : null;

  if (!where) {
    console.warn("⚠️ [STRIPE] Evento sin identificador de usuario resoluble. Ignorado.");
    return;
  }

  const data: Record<string, unknown> = { plan };
  if (stripeCustomerId) data.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId) data.stripeSubscriptionId = stripeSubscriptionId;

  if (plan === "none") {
    // Revocación: no tocamos créditos, solo bloqueamos el acceso al gating de plan
    console.log("🔒 [STRIPE] Revocando plan (suscripción no activa).");
  } else {
    data.aiCredits = creditsForPlan(plan);
    data.creditsResetDate = nextCreditsResetDate();
    console.log(`✅ [STRIPE] Activando plan "${plan}" con ${data.aiCredits} créditos.`);
  }

  await prisma.user.updateMany({ where: where as any, data: data as any });
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
        const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : undefined;
        const plan = session.metadata?.webType || "dinamica";
        await applySubscriptionState({
          userId: Number.isNaN(userId as number) ? undefined : userId,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          plan,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const activeStates = ["active", "trialing"];
        if (!activeStates.includes(sub.status)) {
          // past_due, unpaid, canceled, incomplete_expired => revocar acceso
          await applySubscriptionState({
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
            stripeSubscriptionId: sub.id,
            plan: "none",
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscriptionState({
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
          stripeSubscriptionId: sub.id,
          plan: "none",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await applySubscriptionState({
          stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
          plan: "none",
        });
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

  const webType: string = clientData?.websiteArchitecture?.type || "dinamica";
  
  // Precios mensuales recurrentes
  const PRICES_MONTHLY: Record<string, number> = {
    corporativa: 2900,  // Basic: 29€ al mes
    dinamica:    5900,  // Pro: 59€ al mes
    ecommerce:   11900, // Ecommerce: 119€ al mes
  };
  
  const precioEnCentimos = PRICES_MONTHLY[webType] ?? 5900;
  
  const PRODUCT_NAMES: Record<string, string> = {
    corporativa: "Plan SaaS Avialo Basic",
    dinamica:    "Plan SaaS Avialo Pro",
    ecommerce:   "Plan SaaS Avialo Ecommerce",
  };
  const nombreProducto = PRODUCT_NAMES[webType] ?? "Plan SaaS Avialo Pro";

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

    let customerId = dbUser.stripeCustomerId || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: billingData?.companyName || dbUser.name || undefined,
        metadata: { userId: req.user.id.toString(), cif: billingData?.cif ?? "" },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { stripeCustomerId: customerId },
      }).catch((err: any) => console.error("⚠️ No se pudo persistir stripeCustomerId:", err));
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded' as any,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: nombreProducto,
            description: `Suscripción mensual B2B. Alojamiento e IA para 1 sitio activo completo para la empresa: ${billingData?.companyName || "tu empresa"} (CIF: ${billingData?.cif || "N/A"})`,
          },
          unit_amount: precioEnCentimos,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      }],
      mode: "subscription",
      customer: customerId, // Reutilización del customer (sin customer_email para no duplicar)
      return_url: successUrl || `${process.env.FRONTEND_URL || "http://localhost:5173"}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: req.user.id.toString(),
        webType,
        companyName: billingData?.companyName ?? "",
        cif: billingData?.cif ?? "",
      },
    });

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
    if (dbUser.aiCredits < 10) {
      return res.status(402).json({
        error: "Créditos IA insuficientes. Necesitas al menos 10 créditos para generar una nueva web. Por favor, actualiza tu plan.",
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

    // Descuento ATÓMICO de créditos con guarda (race-safe): solo descuenta si el usuario
    // sigue teniendo plan activo y >=10 créditos. Evita el doble gasto por peticiones
    // concurrentes. Las comprobaciones anteriores son solo para mensajes de error claros.
    const charge = await prisma.user.updateMany({
      where: {
        id: req.user.id,
        plan: { not: "none" },
        aiCredits: { gte: 10 },
      },
      data: { aiCredits: { decrement: 10 } },
    });

    if (charge.count === 0) {
      return res.status(402).json({
        error: "No se pudo descontar el crédito (saldo insuficiente o sin plan activo).",
        code: "INSUFFICIENT_CREDITS",
      });
    }

    // Encolar el job. Si falla, REEMBOLSAR los créditos descontados.
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
        data: { aiCredits: { increment: 10 } },
      }).catch((err: any) => console.error("⚠️ Error al reembolsar créditos tras fallo de encolado:", err));
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
    const cost = isComplexEdit ? 3 : 1;
    const preferredModel = isComplexEdit ? "claude" : "deepseek";

    // Descuento ATÓMICO de los créditos requeridos con guarda (race-safe).
    const charge = await prisma.user.updateMany({
      where: { id: req.user.id, plan: { not: "none" }, aiCredits: { gte: cost } },
      data: { aiCredits: { decrement: cost } },
    });
    if (charge.count === 0) {
      return res.status(402).json({
        error: `No se pudo descontar ${cost} crédito(s) (saldo insuficiente o sin plan activo).`,
        code: "INSUFFICIENT_CREDITS",
      });
    }

    // Actualizar el estado a "generating".
    await prisma.user.update({
      where: { id: req.user.id },
      data: { siteStatus: "generating" }
    });

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
      const maxCredits = {
        none: 50,
        basic: 50,
        corporativa: 50,
        pro: 200,
        dinamica: 200,
        ecommerce: 500
      }[plan] || 50;

      const nextResetDate = new Date();
      nextResetDate.setDate(nextResetDate.getDate() + 30);

      await prisma.user.update({
        where: { id: u.id },
        data: {
          aiCredits: maxCredits,
          creditsResetDate: nextResetDate
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
