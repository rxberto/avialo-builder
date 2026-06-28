// Crea la base de datos indicada en DATABASE_URL si todavía no existe.
// Se conecta a la base `postgres` del mismo servidor para emitir el CREATE DATABASE.
// Idempotente: si ya existe, no hace nada.
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[create-db] DATABASE_URL no definido");
    process.exit(0);
  }

  const parsed = new URL(url);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName) {
    console.error("[create-db] No se pudo extraer el nombre de la BD de DATABASE_URL");
    process.exit(0);
  }

  // Conexión al catálogo `postgres` (siempre existe) para poder crear la BD destino.
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  const { rowCount } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );

  if (rowCount === 0) {
    // El nombre de BD no admite parámetros; se valida que sea un identificador seguro.
    if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
      throw new Error(`Nombre de BD no válido: ${dbName}`);
    }
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[create-db] Base de datos "${dbName}" creada.`);
  } else {
    console.log(`[create-db] Base de datos "${dbName}" ya existe.`);
  }

  await client.end();
}

main().catch((err) => {
  console.error("[create-db] Error:", err.message);
  // No bloquea el arranque: si la BD ya existe por carrera, migrate seguirá.
  process.exit(0);
});
