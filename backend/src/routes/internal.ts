// ============================================================================
// ENDPOINTS INTERNOS (servicio↔servicio). Los consume el provider de pago de Redsys del
// Medusa COMPARTIDO, que no tiene el secreto del tenant: firma/verifica aquí, donde el
// secreto vive cifrado. Auth por token interno compartido (NO es el token del tenant).
// ============================================================================

import { Router, Request, Response } from "express";
import {
  PaymentsError,
  prepareRedsysPayment,
  verifyRedsysNotification,
} from "../services/payments.js";

export const internalRouter = Router();

// Middleware: exige el token interno. Fail-closed si no está configurado.
internalRouter.use((req: Request, res: Response, next): Response | void => {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: "Canal interno no configurado." });
  }
  const got = req.header("x-internal-token") || "";
  if (got !== expected) {
    return res.status(401).json({ error: "No autorizado." });
  }
  next();
});

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function sendError(res: Response, err: unknown): Response {
  if (err instanceof PaymentsError) {
    return res.status(err.status).json({ error: err.message });
  }
  const message = err instanceof Error ? err.message : "Error inesperado.";
  return res.status(500).json({ error: message });
}

/** POST /internal/redsys/prepare → construye la petición Redsys FIRMADA para un Sales Channel. */
internalRouter.post("/redsys/prepare", async (req: Request, res: Response): Promise<Response> => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const salesChannelId = asString(b.salesChannelId);
    const order = asString(b.order);
    const sessionId = asString(b.sessionId);
    const merchantUrl = asString(b.merchantUrl);
    const urlOk = asString(b.urlOk);
    const urlKo = asString(b.urlKo);
    const amountCents = typeof b.amountCents === "number" ? b.amountCents : NaN;
    if (!salesChannelId || !order || !sessionId || !merchantUrl || !urlOk || !urlKo || !Number.isFinite(amountCents)) {
      return res.status(400).json({ error: "Faltan parámetros." });
    }
    const request = await prepareRedsysPayment(salesChannelId, {
      amountCents,
      order,
      sessionId,
      merchantUrl,
      urlOk,
      urlKo,
      description: asString(b.description),
    });
    return res.json({ request });
  } catch (err) {
    return sendError(res, err);
  }
});

/** POST /internal/redsys/verify → verifica una notificación de Redsys (resuelve tenant por FUC). */
internalRouter.post("/redsys/verify", async (req: Request, res: Response): Promise<Response> => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const params = asString(b.Ds_MerchantParameters);
    const signature = asString(b.Ds_Signature);
    if (!params || !signature) {
      return res.status(400).json({ error: "Notificación incompleta." });
    }
    const result = await verifyRedsysNotification(params, signature);
    if (!result) {
      return res.status(400).json({ error: "Firma inválida.", authorized: false });
    }
    return res.json({ result });
  } catch (err) {
    return sendError(res, err);
  }
});
