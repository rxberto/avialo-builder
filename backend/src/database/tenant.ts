import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

// Inicialización del pool de conexiones PostgreSQL
const pool = new Pool({
  connectionString: config.database.url,
});

/**
 * Crea dinámicamente un esquema PostgreSQL para aislar los datos del nuevo cliente.
 * Formato del esquema: tenant_{clientId}
 * 
 * @param clientId ID del cliente sanitizado
 */
export async function createTenantSchema(clientId: string): Promise<{ success: boolean; schemaName: string; error?: string }> {
  // Sanitización estricta del clientId para evitar inyección SQL en identificadores de esquema
  const sanitizedId = clientId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");

  const schemaName = `tenant_${sanitizedId}`;
  const client = await pool.connect();

  try {
    console.log(`🗄️  Creando esquema multi-tenant para cliente: ${schemaName}`);
    
    // Las consultas de nombres de esquemas dinámicos no aceptan variables parametrizadas de $1 en pg,
    // por lo que la sanitización previa estricta mediante regex es obligatoria.
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    
    console.log(`✅ Esquema "${schemaName}" creado o ya existente`);
    return { success: true, schemaName };
  } catch (error: any) {
    console.error(`❌ Error al crear el esquema "${schemaName}":`, error);
    return { success: false, schemaName, error: error.message || "Error al crear el esquema SQL." };
  } finally {
    client.release();
  }
}

// Exportar el pool por si se requiere realizar consultas globales
export { pool };
