import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import RedsysProviderService from "./service"

// Registra el provider de Redsys en el módulo de pago. Provider id: `pp_redsys_<id>`.
export default ModuleProvider(Modules.PAYMENT, {
  services: [RedsysProviderService],
})
