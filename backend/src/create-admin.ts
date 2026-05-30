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
      role: "Administrador"
    },
    create: {
      name: "Roberto",
      email,
      passwordHash,
      plan: "pro",
      aiCredits: 200,
      profession: "Creador",
      role: "Administrador"
    }
  });
  
  console.log("✅ Usuario administrador creado/actualizado con éxito:", user);
}

main()
  .catch((e) => {
    console.error("❌ Error al crear el usuario:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Cerrar la conexión de Prisma
    await prisma.$disconnect();
  });
