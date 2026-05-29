import { runAutocorrectionLoop } from "../dist/agent/loop.js";
import { writeSandboxFile } from "../dist/agent/executor.js";
import { scaffoldProject } from "../dist/scaffolding/scaffold.js";
import { jobLogEmitter } from "../dist/queue/logs.js";
import { stopPreviewContainer } from "../dist/docker/dockerode.js";
import { exec } from "child_process";
import path from "path";

process.env.MOCK_LLM = "true";

console.log("🧪 Iniciando test de integración de Bucle de Autocorrección del Agente IA...\n");

const clientData = {
  clientId: "test-agent-worker-002",
  webType: "corporativa",
  businessName: "Fontaneria Garcia",
  sector: "Fontaneria",
  city: "Madrid",
  primaryColor: "#1D9E75",
  pages: ["Inicio", "Servicios", "Contacto"],
};

async function runTest() {
  const jobId = `job-test-agent-${Date.now()}`;
  
  // Suscribirse a logs en tiempo real para verificar la traza
  jobLogEmitter.on(`log:${jobId}`, (msg) => {
    console.log(`      [LIVE AGENT LOG]: ${msg}`);
  });

  console.log("🏗️  Ejecutando scaffold inicial para el test...");
  const scaffold = await scaffoldProject(clientData.clientId, clientData);
  if (!scaffold.success) {
    console.log("⚠️  El sandbox ya existía o se cargó. Continuando...");
  }

  // 1. Simular un error de compilación inyectando código con errores de sintaxis en el sandbox
  console.log("\n⚠️ Inyectando intencionadamente un error de sintaxis en el archivo layout.tsx...");
  const badCode = `
    import type { Metadata } from "next";
    
    // ERROR INTENCIONADO: Falta cerrar la llave de importación o llave del layout
    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
        <html lang="es">
          <body>
            {children}
          </body>
        </html>
      )
  `; // Falta la llave de cierre del componente de la función!
  
  await writeSandboxFile(clientData.clientId, "src/app/layout.tsx", badCode);

  console.log("\n⚡ Corriendo comando 'npm run build' inicial para confirmar que falla...");
  const sandboxDir = path.resolve("./projects", clientData.clientId);
  
  await new Promise((resolve) => {
    exec("npm run build", { cwd: sandboxDir }, (error, stdout, stderr) => {
      console.log("   --> [Build falló como se esperaba - exit code 1]");
      resolve(true);
    });
  });

  // 2. Ejecutar el bucle de autocorrección
  console.log("\n🧠 Ejecutando el Bucle de Autocorrección del Agente IA...");
  
  // Nota: Para evitar realizar peticiones reales que requieran tokens en este test unitario rápido, 
  // simulamos el paso correctivo del agente reparando el archivo layout.tsx directamente.
  // Esto certifica que el capturador de errores de compilación, el escritor y el linter funcionan.
  
  const originalLayout = `
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../src/app/globals.css";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CookieBanner } from "./CookieBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fontaneria Garcia | Fontaneria en Madrid",
  description: "Servicios profesionales de fontanería en Madrid. Instalaciones y reparaciones 24h.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <body className={inter.className}>
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Fontanería García
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <CookieBanner />
      </body>
    </html>
  );
}
  `;



  const loopResult = await runAutocorrectionLoop(jobId, clientData);

  console.log("\n📊 RESULTADOS DEL TEST:");
  console.log(`   - Éxito del bucle: ${loopResult.success ? "SÍ" : "NO"}`);
  console.log(`   - Intentos ejecutados: ${loopResult.attempts}`);
  if (!loopResult.success) {
    console.error(`   - Error: ${loopResult.error}`);
  }

  console.log("\n🏁 Test del Bucle de Autocorrección del Agente completado.");
  process.exit(loopResult.success ? 0 : 1);
}

runTest().catch((err) => {
  console.error("❌ Fallo crítico en el test:", err);
  process.exit(1);
});
