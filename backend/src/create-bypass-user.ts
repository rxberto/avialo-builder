import { prisma } from "./database/client.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🔥 Limpiando cuentas de bypass anteriores del script...");
  
  // Limpiar las cuentas que creamos en las pruebas anteriores para no dejar basura
  const oldEmails = [
    "roberto@roberto.com", 
    "roberto@com", 
    "roberto-eco@roberto.com", 
    "roberto-eco@com"
  ];
  
  const deleted = await prisma.user.deleteMany({
    where: {
      email: {
        in: oldEmails
      }
    }
  });
  console.log(`🗑️ Eliminadas ${deleted.count} cuentas antiguas de bypass.`);

  const email = "roberto2@gmail.com";
  const password = "123456";
  const passwordHash = await bcrypt.hash(password, 10);

  console.log(`⏳ Creando o actualizando cuenta PRO para ${email} con onboarding completado...`);

  // Crear o actualizar la cuenta final roberto2@gmail.com
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Roberto",
      passwordHash,
      plan: "pro",
      role: "user",
      profession: "Emprendedor",
      aiCredits: 500,
      siteName: "Mi Sitio Web Pro",
      siteType: "corporativa",
      siteDomain: "roberto2.avialo.app",
      siteStatus: "deployed" // "deployed" para que aparezca directamente el dashboard con la web lista
    },
    create: {
      name: "Roberto",
      email,
      passwordHash,
      plan: "pro",
      role: "user",
      profession: "Emprendedor",
      aiCredits: 500,
      siteName: "Mi Sitio Web Pro",
      siteType: "corporativa",
      siteDomain: "roberto2.avialo.app",
      siteStatus: "deployed"
    },
  });

  console.log("-----------------------------------------");
  console.log("✅ ¡CUENTA BYPASS CREADA CON ÉXITO!");
  console.log(`📧 Correo: ${user.email}`);
  console.log(`🔑 Contraseña: ${password}`);
  console.log(`📦 Plan: ${user.plan}`);
  console.log(`🌐 Web: ${user.siteDomain} (${user.siteStatus})`);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Error creando usuario bypass:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
