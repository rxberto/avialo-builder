import { prisma } from "./database/client.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🔥 Reseteando cuentas anteriores del script...");
  
  // Limpiamos todo rastro de las cuentas antiguas
  const oldEmails = [
    "roberto@roberto.com", 
    "roberto@com", 
    "roberto-eco@roberto.com", 
    "roberto-eco@com"
  ];
  
  await prisma.user.deleteMany({
    where: {
      email: {
        in: oldEmails
      }
    }
  });

  const email = "roberto2@gmail.com";
  const password = "123456";
  const passwordHash = await bcrypt.hash(password, 10);

  console.log(`⏳ Creando/Actualizando cuenta PRO de ${email} en estado inicial limpio...`);

  // Creamos la cuenta con plan PRO y onboarding de perfil completado, 
  // pero sin sitio web pre-creado falso (siteStatus: "none").
  // Esto le permitirá iniciar la generación de una web REAL desde el Dashboard.
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Roberto",
      passwordHash,
      plan: "pro",
      role: "user",
      profession: "Emprendedor",
      aiCredits: 500,
      
      // Reseteamos cualquier sitio falso previo
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
      role: "user",
      profession: "Emprendedor",
      aiCredits: 500,
      
      siteName: null,
      siteType: null,
      siteDomain: null,
      siteJobId: null,
      siteStatus: "none"
    },
  });

  console.log("-----------------------------------------");
  console.log("✅ ¡CUENTA BYPASS PRO ACTUALIZADA!");
  console.log(`📧 Correo: ${user.email}`);
  console.log(`🔑 Contraseña: ${password}`);
  console.log(`📦 Plan: ${user.plan}`);
  console.log("🌐 Estado Web: Ninguna generada aún (siteStatus: none)");
  console.log("💡 Nota: Podrás iniciar una generación real al entrar.");
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
