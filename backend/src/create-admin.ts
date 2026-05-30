import { prisma } from "./database/client.js";

async function main() {
  const email = "roberto@avialo.es";
  
  // Eliminar el usuario si existe para empezar de cero (Fresh Start)
  const result = await prisma.user.deleteMany({
    where: { email }
  });
  
  console.log(`✅ Fresh Start completado con éxito: Se eliminó el usuario '${email}' de la base de datos.`);
  console.log(`Cantidad de registros borrados: ${result.count}`);
}

main()
  .catch((e) => {
    console.error("❌ Error al eliminar el usuario de la base de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
