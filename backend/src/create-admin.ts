import { prisma } from "./database/client.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🔥 Limpiando toda la base de datos...");

  // Reset completo — borra TODOS los usuarios
  const deleted = await prisma.user.deleteMany({});
  console.log(`🗑️  Eliminados ${deleted.count} usuarios.`);

  // Crear el único admin
  const email = "roberto@avialo.es";
  const passwordHash = await bcrypt.hash("PepitoGrillo123!", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Roberto",
      email,
      passwordHash,
      plan: "admin",      // plan especial para distinguirlo
      aiCredits: 0,
      profession: "Admin",
      role: "admin",
      siteName: null,
      siteType: null,
      siteDomain: null,
      siteJobId: null,
      siteStatus: "none",
    },
  });

  console.log("✅ Admin creado:", admin.email, "| role:", admin.role);
}

main()
  .catch((e) => {
    console.error("❌ Error en el reset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
