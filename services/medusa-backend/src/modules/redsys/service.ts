import { AbstractPaymentProvider, BigNumber, MedusaError } from "@medusajs/framework/utils"
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"

// Opciones del provider (medusa-config). El secreto del tenant NO vive aquí: la firma y la
// verificación las hace el ORQUESTADOR (que custodia el secreto cifrado por tenant). Este
// provider solo orquesta el flujo nativo de Medusa y delega la cripto vía canal interno.
type RedsysOptions = {
  orchestratorUrl: string // URL interna del orquestador (p.ej. http://avialo-orchestrator:3000)
  internalToken: string // token del canal interno (x-internal-token)
  webhookUrl?: string // URL de notificación de Redsys → hook de pago de Medusa
}

type RedsysRequestData = {
  url: string
  Ds_SignatureVersion: string
  Ds_MerchantParameters: string
  Ds_Signature: string
}

/**
 * Provider de Redsys (TPV virtual español) — flujo REDIRECT nativo de Medusa:
 *  initiatePayment → la storefront auto-postea al TPV → el banco notifica al hook de Medusa →
 *  getWebhookActionAndData(authorized) → Medusa autoriza la sesión y completa el carrito.
 */
class RedsysProviderService extends AbstractPaymentProvider<RedsysOptions> {
  static identifier = "redsys"

  // Constructor público (el de la base es protected → necesario para registrarlo como provider).
  constructor(cradle: Record<string, unknown>, options: RedsysOptions) {
    super(cradle, options)
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.orchestratorUrl || !options.internalToken) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "El provider Redsys requiere orchestratorUrl e internalToken."
      )
    }
  }

  private get opts(): RedsysOptions {
    return this.config as RedsysOptions
  }

  // Petición interna autenticada al orquestador (firma/verificación con el secreto del tenant).
  private async callOrchestrator<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.opts.orchestratorUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": this.opts.internalToken,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => "")
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Redsys (orquestador): ${res.status} ${msg}`)
    }
    return (await res.json()) as T
  }

  // Genera un nº de pedido Redsys válido (12 dígitos, empieza por dígitos).
  private newOrder(): string {
    const ts = Date.now().toString().slice(-8)
    const rnd = Math.floor(1000 + Math.random() * 9000).toString()
    return `${ts}${rnd}`.slice(0, 12)
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const sessionId = typeof data.session_id === "string" ? data.session_id : ""
    const salesChannelId = typeof data.sales_channel_id === "string" ? data.sales_channel_id : ""
    if (!salesChannelId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Falta sales_channel_id para Redsys.")
    }

    const amountCents = Math.round(new BigNumber(input.amount).numeric * 100)
    const order = this.newOrder()
    const urlOk = typeof data.url_ok === "string" ? data.url_ok : ""
    const urlKo = typeof data.url_ko === "string" ? data.url_ko : ""
    const merchantUrl =
      (typeof data.notify_url === "string" ? data.notify_url : "") || this.opts.webhookUrl || ""

    const { request } = await this.callOrchestrator<{ request: RedsysRequestData }>(
      "/internal/redsys/prepare",
      {
        salesChannelId,
        amountCents,
        order,
        sessionId,
        merchantUrl,
        urlOk,
        urlKo,
        description: typeof data.description === "string" ? data.description : undefined,
      }
    )

    return {
      id: order,
      status: "pending",
      // `data` es público: solo lleva los parámetros de redirección (sin secretos).
      data: { order, session_id: sessionId, status: "pending", redsys: request },
    }
  }

  // Redirect asíncrono: la sesión queda PENDIENTE hasta que el banco notifica (webhook).
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return { status: "pending", data: input.data ?? {} }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const status = (input.data?.status as GetPaymentStatusOutput["status"]) || "pending"
    return { status, data: input.data ?? {} }
  }

  // Redsys con TransactionType "0" autoriza Y captura en el mismo paso.
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: { ...(input.data ?? {}), status: "captured" } }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  // Los reembolsos de Redsys son una transacción aparte (TransactionType 3) desde el TPV.
  // Fallamos en alto para NO marcar un reembolso como hecho sin haberlo ejecutado.
  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Los reembolsos de Redsys deben hacerse desde el panel del TPV del banco."
    )
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = (payload.data ?? {}) as Record<string, unknown>
    const params = typeof body.Ds_MerchantParameters === "string" ? body.Ds_MerchantParameters : ""
    const signature = typeof body.Ds_Signature === "string" ? body.Ds_Signature : ""
    if (!params || !signature) {
      return { action: "not_supported" }
    }

    try {
      const { result } = await this.callOrchestrator<{
        result: { authorized: boolean; sessionId: string; amountCents: number }
      }>("/internal/redsys/verify", { Ds_MerchantParameters: params, Ds_Signature: signature })

      const amount = new BigNumber((result.amountCents || 0) / 100)
      if (result.authorized) {
        return { action: "authorized", data: { session_id: result.sessionId, amount } }
      }
      return { action: "failed", data: { session_id: result.sessionId, amount } }
    } catch {
      // Firma inválida o error de verificación → no autorizamos nada.
      return { action: "failed", data: { session_id: "", amount: new BigNumber(0) } }
    }
  }
}

export default RedsysProviderService
