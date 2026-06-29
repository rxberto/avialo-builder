import * as Sentry from "@sentry/node";
import { pino } from "pino";

// ============================================
// OBSERVABILIDAD: Sentry + logging estructurado (pino)
// ============================================

const SENTRY_DSN = process.env.SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

// Logger estructurado (JSON en producción; legible en desarrollo).
// SEGURIDAD: redactamos cabeceras y campos con secretos para que NUNCA aparezcan en los logs
// (tokens de tenant, token del canal interno, cookies de sesión, firmas y secretos de Stripe).
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-internal-token"]',
      'req.headers["stripe-signature"]',
      'res.headers["set-cookie"]',
      // Por si algún log estructurado incluye estos campos directamente.
      'storeMgmtToken',
      'secretKey',
      'redsysSecretKeyEnc',
      '*.authorization',
    ],
    censor: '[REDACTED]',
  },
  ...(isProd
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } }),
});

let sentryEnabled = false;

/**
 * Inicializa Sentry si hay DSN configurado. Es un no-op seguro si no lo hay.
 * Debe llamarse lo antes posible en el arranque (server.ts / worker.ts).
 */
export function initObservability(serviceName: string): void {
  if (!SENTRY_DSN) {
    logger.warn(`Sentry no configurado (SENTRY_DSN ausente) — seguimiento de errores deshabilitado para ${serviceName}.`);
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
    serverName: serviceName,
  });
  sentryEnabled = true;
  logger.info(`Sentry inicializado para ${serviceName}.`);
}

/**
 * Captura una excepción en Sentry (si está habilitado) y la registra siempre en el log.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  logger.error({ err: error, ...context }, "Excepción capturada");
  if (sentryEnabled) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
}

export { Sentry };
