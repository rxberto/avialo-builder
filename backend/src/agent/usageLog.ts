import { prisma } from "../database/client.js";
import { estimateCostUsd } from "./cost.js";

/**
 * Persiste una fila de consumo de IA (tokens + coste) para contabilidad por job/usuario.
 * Realiza una transacción enterprise-grade para deducir créditos del usuario y guardar en el ledger.
 * Fire-and-forget: no debe bloquear ni romper la generación si la escritura falla.
 */
export async function recordJobUsage(params: {
  jobId: string;
  userId?: number;
  kind: "generation" | "edit";
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const costUsd = estimateCostUsd(params.model, params.inputTokens, params.outputTokens);
  // 1 Crédito = $0.01. Se cobra mínimo 1 crédito por acción que involucre tokens.
  const creditsUsed = costUsd > 0 ? Math.max(1, Math.ceil(costUsd * 100)) : 0;

  try {
    if (params.userId && creditsUsed > 0) {
      await prisma.$transaction([
        prisma.jobUsage.create({
          data: {
            jobId: params.jobId,
            userId: params.userId,
            kind: params.kind,
            model: params.model,
            inputTokens: params.inputTokens,
            outputTokens: params.outputTokens,
            costUsd,
            creditsUsed,
          },
        }),
        prisma.user.update({
          where: { id: params.userId },
          data: { aiCredits: { decrement: creditsUsed } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: params.userId,
            amount: -creditsUsed,
            reason: `JobUsage: ${params.kind} (${params.model})`,
            metadata: JSON.stringify({ jobId: params.jobId, inputTokens: params.inputTokens, outputTokens: params.outputTokens, costUsd }),
          },
        }),
      ]);
    } else {
      // Si no hay usuario (ej. job huérfano) o el coste es 0, solo registramos uso.
      await prisma.jobUsage.create({
        data: {
          jobId: params.jobId,
          userId: params.userId,
          kind: params.kind,
          model: params.model,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costUsd,
          creditsUsed,
        },
      });
    }
  } catch (err: any) {
    console.error("⚠️ Error crítico al registrar JobUsage y deducir créditos:", err.message);
  }
}
