import express, { Request, Response } from "express";
import cors from "cors";
import Stripe from "stripe";
import { config } from "./config/env.js";
import { routeModel, routeUnknownTask } from "./models/router.js";
import { SYSTEM_PROMPT, isOutOfScope } from "./prompts/system-base.js";
import { generationQueue } from "./queue/queue.js";
import { jobStatuses } from "./queue/worker.js";
import { jobLogEmitter, getJobLogs } from "./queue/logs.js";
import { authRouter, authenticateToken, AuthRequest, verifyAndResetCredits } from "./routes/auth.js";
import { connectPrisma, prisma } from "./database/client.js";
import { listSandboxFiles, getSandboxFileContent } from "./scaffolding/fileHelper.js";
import { runEditAutocorrectionLoop } from "./agent/editLoop.js";

const app = express();
const PORT = config.server.port;

// Stripe inicializado con clave del .env (si existe)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && stripeSecretKey !== "sk_test_..."
  ? new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" as any })
  : null;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ============================================
// REGISTRO DE RUTAS DE AUTENTICACIÓN (NUEVO)
// ============================================
app.use("/api/auth", authRouter);

// ============================================
// ENDPOINTS DE SALUD Y UTILIDADES
// ============================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "avialo-builder-api",
    version: "2.0.0",
    stripe: stripe ? "configured" : "not_configured",
    timestamp: new Date().toISOString(),
  });
});

app.get("/route/:taskType", async (req: Request, res: Response) => {
  const result = await routeModel(req.params.taskType);
  res.json(result);
});

app.post("/classify", async (req: Request, res: Response): Promise<any> => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Falta el campo description" });
  }
  const result = await routeUnknownTask(description);
  res.json(result);
});

app.post("/chat", async (req: Request, res: Response): Promise<any> => {
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

  // Modo DEV sin Stripe configurado
  if (!stripe) {
    console.warn("⚠️  [CHECKOUT] Stripe no configurado. Devolviendo sessionId de prueba.");
    return res.json({
      sessionId: `dev_session_${Date.now()}`,
      url: null,
      dev: true,
      message: "Stripe no configurado. En producción aquí irá la URL de suscripción real.",
    });
  }

  try {
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
      customer_email: req.user.email,
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

    const job = await generationQueue.add(`generation-${clientId}`, {
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

    const jobId = job.id || `job-${Date.now()}`;

    jobStatuses.set(jobId, {
      jobId,
      state: "pending",
      progress: 0,
      updatedAt: new Date().toISOString(),
    });

    // Guardar detalles del sitio web en la tabla User de PostgreSQL y descontar 10 créditos
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        siteName: businessName,
        siteType: webType,
        siteDomain: body.customDomain?.trim().toLowerCase().replace(/https?:\/\//, '') || `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.avialo.app`,
        siteJobId: jobId,
        siteStatus: "pending",
        aiCredits: { decrement: 10 }
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
app.get("/api/jobs/:id", (req: Request, res: Response): any => {
  const jobId = req.params.id;
  const jobData = jobStatuses.get(jobId);

  if (!jobData) {
    return res.status(404).json({ error: `Trabajo con ID "${jobId}" no encontrado.` });
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
app.get("/api/jobs/:id/logs", (req: Request, res: Response): any => {
  const jobId = req.params.id;

  res.writeHead(200, {
    "Content-Type":                "text/event-stream",
    "Cache-Control":               "no-cache",
    "Connection":                  "keep-alive",
    "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
  });

  const initialLogs = getJobLogs(jobId);
  initialLogs.forEach((log) => {
    res.write(`event: log\ndata: ${JSON.stringify({ message: log })}\n\n`);
  });

  const currentStatus = jobStatuses.get(jobId);
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

  try {
    const job = await generationQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Trabajo de generación con ID "${jobId}" no encontrado.` });
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

  try {
    const job = await generationQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Trabajo de generación con ID "${jobId}" no encontrado.` });
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

    const job = await generationQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Trabajo de generación con ID "${jobId}" no encontrado.` });
    }

    const clientId = job.data.clientId;
    if (!clientId) {
      return res.status(400).json({ error: "El trabajo no posee un identificador de cliente válido." });
    }

    // Actualizar el estado a "generating" en PostgreSQL y memoria, y descontar 1 crédito
    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        siteStatus: "generating",
        aiCredits: { decrement: 1 }
      }
    });

    const currentStatus = jobStatuses.get(jobId);
    jobStatuses.set(jobId, {
      jobId,
      state: "generating",
      progress: 20,
      previewUrl: currentStatus?.previewUrl,
      port: currentStatus?.port,
      updatedAt: new Date().toISOString()
    });

    // Iniciar el bucle de edición en segundo plano (asíncrono)
    runEditAutocorrectionLoop(jobId, clientId, prompt, req.user.id).catch((err) => {
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

async function startServer() {
  // Conectar Prisma a PostgreSQL antes de escuchar peticiones
  await connectPrisma();
  
  app.listen(PORT, () => {
    console.log(`\n✅ Servidor Avialo v2 (TypeScript) corriendo en http://localhost:${PORT}`);
    console.log(`   GET  /health`);
    console.log(`   GET  /route/:taskType`);
    console.log(`   POST /classify`);
    console.log(`   POST /chat`);
    console.log(`   POST /api/checkout  (Stripe Subscriptions JWT)`);
    console.log(`   POST /api/jobs      (JWT Protected)`);
    console.log(`   GET  /api/jobs/:id`);
    console.log(`   GET  /api/jobs/:id/logs\n`);
  });
}

startServer();
