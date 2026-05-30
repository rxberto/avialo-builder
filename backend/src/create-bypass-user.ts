import { prisma } from "./database/client.js";
import bcrypt from "bcryptjs";

async function main() {
  const password = "123456";
  const passwordHash = await bcrypt.hash(password, 10);

  // Definición de los usuarios a crear con sus respectivos planes
  const usersToCreate = [
    // Cuenta con Plan Pro
    {
      emails: ["roberto@roberto.com", "roberto@com"],
      name: "Roberto Pro Bypass",
      plan: "pro",
      role: "user",
      aiCredits: 500,
    },
    // Cuenta con Plan eCommerce
    {
      emails: ["roberto-eco@roberto.com", "roberto-eco@com"],
      name: "Roberto eCommerce Bypass",
      plan: "ecommerce",
      role: "user",
      aiCredits: 1000,
    }
  ];

  for (const group of usersToCreate) {
    for (const email of group.emails) {
      console.log(`⏳ Creando o actualizando usuario ${email} con plan ${group.plan}...`);
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          passwordHash,
          plan: group.plan,
          role: group.role,
          aiCredits: group.aiCredits,
        },
        create: {
          name: group.name,
          email,
          passwordHash,
          plan: group.plan,
          role: group.role,
          aiCredits: group.aiCredits,
          siteStatus: "none",
        },
      });
      console.log(`✅ Usuario creado/actualizado: ${user.email} | Plan: ${user.plan} | Rol: ${user.role}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Error creando usuarios bypass:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
