// Setup E2E (TEMPORAL): deja todo listo para probar el panel del cliente end-to-end.
//  - Provisiona la tienda Medusa del tenant "e2e" (canal + publishable key + productos demo).
//  - Crea el schema del tenant (tenant_e2e) con su tabla User + admin sembrado (login del panel).
//  - Crea/actualiza el User del orquestador con el storeMgmtToken → su Sales Channel.
import "../config/env.js";
import { provisionTenantStore } from "../services/medusa.js";
import {
  createTenantSchema,
  migrateTenantSchema,
  seedTenantAdmin,
} from "../database/tenant.js";
import { prisma } from "../database/client.js";

const CLIENT = "e2e";
const MGMT_TOKEN = "smt_e2e123456789";
const ADMIN_EMAIL = "dueno@aurora.test";
const ADMIN_PASS = "aurora2026";

async function main() {
  console.log("== 1) Provisionar tienda Medusa del tenant e2e ==");
  const store = await provisionTenantStore(CLIENT, { withSampleProducts: true });
  console.log("   canal:", store.salesChannelId, "| key:", store.publishableKey);

  console.log("== 2) Schema del tenant + admin del panel ==");
  const s = await createTenantSchema(CLIENT);
  if (!s.success) throw new Error("createTenantSchema: " + s.error);
  const m = await migrateTenantSchema(CLIENT);
  if (!m.success) throw new Error("migrateTenantSchema: " + m.error);
  const seed = await seedTenantAdmin(CLIENT, {
    name: "Dueño Aurora",
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  });
  if (!seed.success) throw new Error("seedTenantAdmin: " + seed.error);
  console.log("   schema tenant_e2e + admin sembrado:", ADMIN_EMAIL);

  console.log("== 3) User del orquestador con el storeMgmtToken ==");
  await prisma.user.upsert({
    where: { storeMgmtToken: MGMT_TOKEN },
    update: { medusaSalesChannelId: store.salesChannelId, medusaPublishableKey: store.publishableKey },
    create: {
      name: "Cuenta E2E",
      email: "cuenta-e2e@avialo.test",
      passwordHash: "x",
      storeMgmtToken: MGMT_TOKEN,
      medusaSalesChannelId: store.salesChannelId,
      medusaPublishableKey: store.publishableKey,
    },
  });

  console.log("\nE2E_SETUP_DONE");
  console.log(
    JSON.stringify({
      salesChannelId: store.salesChannelId,
      publishableKey: store.publishableKey,
      mgmtToken: MGMT_TOKEN,
      adminEmail: ADMIN_EMAIL,
      adminPass: ADMIN_PASS,
      tenantSchema: "tenant_" + CLIENT,
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("SETUP_ERROR", e);
    process.exit(1);
  });
