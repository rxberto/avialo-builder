import { prisma } from "./database/client.js";
import bcrypt from "bcryptjs";

async function main() {
  const emails = ["roberto@roberto.com", "roberto@com"];
  const password = "123456";
  const passwordHash = await bcrypt.hash(password, 10);

  for (const email of emails) {
    console.log(`⏳ Creando o actualizando usuario ${email}...`);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        plan: "admin",
        role: "admin",
        aiCredits: 1000,
      },
      create: {
        name: "Roberto Bypass",
        email,
        passwordHash,
        plan: "admin",
        role: "admin",
        aiCredits: 1000,
        siteStatus: "none",
      },
    });
    console.log(`✅ Usuario creado/actualizado: ${user.email} con plan ${user.plan}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error creando usuario bypass:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
