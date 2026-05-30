import { pool } from "./tenant.js";
import { exec } from "child_process";
import { config } from "../config/env.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const boilerplateSchemaPath = path.resolve(__dirname, "../../../boilerplates/corporate/prisma/schema.prisma");

interface MigrationResult {
  schemaName: string;
  success: boolean;
  stdout?: string;
  error?: string;
}

/**
 * Recorre en bucle todos los esquemas de bases de datos B2B creados para clientes (tenant_*)
 * y ejecuta 'prisma db push' para mantenerlos sincronizados con la última versión del schema.
 */
export async function migrateAllTenants(): Promise<MigrationResult[]> {
  console.log(`\n🔄 [MIGRATOR] Iniciando migración en lote para esquemas multi-tenant...`);
  console.log(`📂 Ruta del esquema base: ${boilerplateSchemaPath}\n`);

  const results: MigrationResult[] = [];

  try {
    // 1. Obtener la lista de todos los esquemas dinámicos del catálogo de PostgreSQL
    const query = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name ASC;
    `;
    
    const { rows } = await pool.query(query);
    const tenants = rows.map((r: any) => r.schema_name);

    if (tenants.length === 0) {
      console.log("ℹ️ No se detectaron esquemas de clientes 'tenant_*' en la base de datos.");
      return [];
    }

    console.log(`🗄️  Se encontraron ${tenants.length} esquema(s) para migrar:`, tenants);

    // 2. Iterar sobre cada esquema
    for (const schemaName of tenants) {
      console.log(`\n🚀 Migrando esquema: "${schemaName}"...`);
      
      // Reconstruir la DATABASE_URL con el esquema del tenant actual
      let tenantDbUrl = config.database.url;
      if (tenantDbUrl.includes("schema=")) {
        tenantDbUrl = tenantDbUrl.replace(/schema=[^&]*/, `schema=${schemaName}`);
      } else {
        const separator = tenantDbUrl.includes("?") ? "&" : "?";
        tenantDbUrl = `${tenantDbUrl}${separator}schema=${schemaName}`;
      }

      // Evitar saturar el pooling durante la migración
      if (tenantDbUrl.includes("connection_limit=")) {
        tenantDbUrl = tenantDbUrl.replace(/connection_limit=[^&]*/, `connection_limit=2`);
      } else {
        tenantDbUrl = `${tenantDbUrl}&connection_limit=2`;
      }

      // Ejecutar prisma db push asíncronamente para este tenant
      const result = await new Promise<MigrationResult>((resolve) => {
        // Usamos variables de entorno específicas para inyectar la URL del tenant temporalmente
        const env = { 
          ...process.env, 
          DATABASE_URL: tenantDbUrl 
        };

        const command = `npx prisma db push --schema="${boilerplateSchemaPath}" --skip-generate --accept-data-loss`;

        exec(command, { env, timeout: 45000 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Fallo al migrar esquema "${schemaName}":`, error.message);
            resolve({
              schemaName,
              success: false,
              error: stderr.toString() || error.message
            });
          } else {
            console.log(`✅ Esquema "${schemaName}" migrado con éxito.`);
            resolve({
              schemaName,
              success: true,
              stdout: stdout.toString().trim()
            });
          }
        });
      });

      results.push(result);
    }

    console.log(`\n🎉 [MIGRATOR] Proceso de migración finalizado. Exitosos: ${results.filter(r => r.success).length}/${results.length}`);
    return results;

  } catch (error: any) {
    console.error("❌ Fallo crítico en el orquestador de migraciones:", error);
    throw error;
  }
}

// Ejecutar directamente si se arranca como un script ejecutable secundario
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrateAllTenants()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
