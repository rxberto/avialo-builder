import "../config/env.js";
import express from "express";
import { tenantStoreRouter } from "../routes/tenantStore.js";
const app = express();
// Límite alto para aceptar imágenes en base64 (mismo que el server real).
app.use(express.json({ limit: "10mb" }));
app.use("/api/tenant-store", tenantStoreRouter);
app.listen(4099, "0.0.0.0", () => console.log("ORCH_READY on 4099"));
