import type Stripe from "stripe"
import { StripeProviderService } from "@medusajs/payment-stripe/dist/services"

/**
 * Provider de pago que extiende Stripe para DESTINATION CHARGES de Stripe Connect:
 * el cobro de la tienda del tenant se enruta a SU cuenta conectada (acct_...). Avialo,
 * como plataforma, puede llevar una comisión (application_fee_amount).
 *
 * Punto de extensión: `normalizePaymentIntentParameters`. El `initiatePayment` de la base
 * esparce el resultado de este método dentro del PaymentIntent, así que basta con añadir
 * aquí `transfer_data` / `on_behalf_of` / `application_fee_amount` cuando llega una cuenta
 * conectada — sin reimplementar el método ni tocar la creación del intent.
 *
 * La cuenta destino y la comisión llegan en `data` (las pone la storefront a partir de sus
 * ajustes resueltos en servidor). Endurecimiento futuro: resolver la cuenta DENTRO del
 * provider vía cart → sales channel (requiere acceso cross-módulo, no disponible hoy en el
 * contenedor aislado del módulo de pago).
 */
class StripeConnectProviderService extends StripeProviderService {
  static identifier = "stripe-connect"

  normalizePaymentIntentParameters(
    extra?: Record<string, unknown>
  ): Partial<Stripe.PaymentIntentCreateParams> {
    const params = super.normalizePaymentIntentParameters(extra)

    const destination = extra?.connected_account
    if (typeof destination === "string" && destination.startsWith("acct_")) {
      // Destination charge: el cargo se procesa en la plataforma y se transfiere al pyme.
      params.on_behalf_of = destination
      params.transfer_data = { destination }

      // Comisión de la plataforma (en la unidad mínima, p.ej. céntimos). Solo si es válida.
      const fee = extra?.application_fee_amount
      if (typeof fee === "number" && Number.isInteger(fee) && fee > 0) {
        params.application_fee_amount = fee
      }
    }

    return params
  }
}

export default StripeConnectProviderService
