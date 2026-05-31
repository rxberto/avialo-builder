import { prisma } from "../database/client.js";
import { estimateCostUsd } from "./cost.js";

/**
 * Persiste una fila de consumo de IA (tokens + coste) para contabilidad por job/usuario.
 * Fire-and-forget: no debe bloquear ni romper la generación si la escritura falla.
 */
export function recordJobUsage(params: {
  jobId: string;
  userId?: number;
  kind: "generation" | "edit";
  model: string;
  inputTokens: number;
  outputTokens: number;
}): void {
  const costUsd = estimateCostUsd(params.model, params.inputTokens, params.outputTokens);
  prisma.jobUsage
    .create({
      data: {
        jobId: params.jobId,
        userId: params.userId,
        kind: params.kind,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd,
      },
    })
    .catch((err: any) => console.error("⚠️ Error al registrar JobUsage:", err.message));
}
