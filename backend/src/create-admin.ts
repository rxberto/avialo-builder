import { prisma } from "./database/client.js";
import bcrypt from "bcryptjs";

async function main() {
  const email = "roberto@avialo.es";
  const passwordHash = await bcrypt.hash("PepitoGrillo123!", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Roberto",
      passwordHash,
      plan: "pro",
      aiCredits: 200,
      profession: "Fundador",
      role: "admin",
      siteName: null,
      siteType: null,
      siteDomain: null,
      siteJobId: null,
      siteStatus: "none",
    },
    create: {
      name: "Roberto",
      email,
      passwordHash,
      plan: "pro",
      aiCredits: 200,
      profession: "Fundador",
      role: "admin",
      siteName: null,
      siteType: null,
      siteDomain: null,
      siteJobId: null,
      siteStatus: "none",
    },
  });

  console.log("✅ Admin creado/actualizado:", user.email, "| plan:", user.plan, "| créditos:", user.aiCredits);
}

main()
  .catch((e) => {
    console.error("❌ Error al eliminar el usuario de la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
