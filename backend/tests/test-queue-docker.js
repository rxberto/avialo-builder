import { generationQueue } from "../dist/queue/queue.js";
import { jobStatuses } from "../dist/queue/worker.js";
import { jobLogEmitter } from "../dist/queue/logs.js";
import { stopPreviewContainer } from "../dist/docker/dockerode.js";

console.log("🧪 Iniciando test de integración de colas y Docker...\n");

const testJobs = [
  {
    clientId: "test-corp-worker-001",
    data: {
      clientId: "test-corp-worker-001",
      webType: "corporativa",
      businessName: "Fontaneria Garcia",
      sector: "Fontaneria",
      city: "Madrid",
      primaryColor: "#1D9E75",
      pages: ["Inicio", "Servicios", "Contacto"],
    }
  }
];

async function runTest() {
  const activeContainers = [];

  for (const jobConfig of testJobs) {
    const { clientId, data } = jobConfig;
    const jobId = `job-test-${clientId}-${Date.now()}`;

    console.log(`\n📥 Encolando trabajo de prueba: ${jobId}`);

    // Suscribirse a los logs en tiempo real emitidos por el worker (emulación SSE)
    jobLogEmitter.on(`log:${jobId}`, (msg) => {
      console.log(`      [LIVE LOG]: ${msg}`);
    });

    // Agregar a la cola
    const job = await generationQueue.add(jobId, data, { jobId });

    // Esperar y monitorear hasta que termine
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        const status = jobStatuses.get(jobId);
        if (status) {
          console.log(`   --> [Progreso]: ${status.state.toUpperCase()} (${status.progress}%)`);
          
          if (status.state === "deployed") {
            clearInterval(interval);
            console.log(`\n🎉 ¡Trabajo ${jobId} completado con éxito!`);
            console.log(`   🔗 URL de Preview: ${status.previewUrl}`);
            
            // Guardar puerto de contenedor para detener al finalizar el test
            const containerName = `avialo-preview-${clientId}`;
            activeContainers.push(containerName);
            resolve();
          } else if (status.state === "failed") {
            clearInterval(interval);
            console.error(`\n❌ ¡Trabajo ${jobId} falló!: ${status.error}`);
            resolve();
          }
        }
      }, 1000);
    });
  }

  // Esperar 4 segundos para que la previsualización se mantenga y luego detener contenedores
  console.log("\n⏳ Manteniendo contenedores activos durante 4 segundos para verificación...");
  await new Promise((r) => setTimeout(r, 4000));

  console.log("\n🧹 Limpiando y deteniendo contenedores de prueba...");
  for (const containerName of activeContainers) {
    await stopPreviewContainer(containerName);
  }

  console.log("\n🏁 Test de integración completado.");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Fallo crítico en el test:", err);
  process.exit(1);
});
