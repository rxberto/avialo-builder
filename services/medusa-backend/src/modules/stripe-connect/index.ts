import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import StripeConnectProviderService from "./service"

// Registra el provider de Stripe Connect dentro del módulo de pago de Medusa.
// El id del provider resultante es `pp_stripe-connect_<id>` (ver medusa-config).
export default ModuleProvider(Modules.PAYMENT, {
  services: [StripeConnectProviderService],
})
