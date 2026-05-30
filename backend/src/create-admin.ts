import { prisma } from "./database/client.js";
import bcrypt from "bcryptjs";

async function main() {
  const email = "roberto@avialo.es";
  const passwordHash = await bcrypt.hash("123456", 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      plan: "pro", // Plan Pro activo para saltarse el pago
      aiCredits: 200,
      profession: "Creador",
      role: "Administrador",
      // Resetear la web a un inicio completamente limpio
      siteName: null,
      siteType: null,
      siteDomain: null,
      siteJobId: null,
      siteStatus: "none"
    },
    create: {
      name: "Roberto",
      email,
      passwordHash,
      plan: "pro",
      aiCredits: 200,
      profession: "Creador",
      role: "Administrador",
      siteName: null,
      siteType: null,
      siteDomain: null,
      siteJobId: null,
      siteStatus: "none"
    }
  });
  
  console.log("✅ Usuario administrador reseteado/inicializado a Fresh Start con éxito:", user);
}

main()
  .catch((e) => {
    console.error("❌ Error al resetear el usuario:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
