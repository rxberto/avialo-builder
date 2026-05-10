import express from 'express';
import cors from 'cors';
import { routeModel, routeUnknownTask } from './models/router.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ── Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'avialo-builder-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Qué modelo se usaría para una tarea conocida
app.get('/route/:taskType', async (req, res) => {
  const result = await routeModel(req.params.taskType);
  res.json(result);
});

// ── Clasificar tarea desconocida en lenguaje natural
app.post('/classify', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Falta el campo description' });
  }
  const result = await routeUnknownTask(description);
  res.json(result);
});

// ── Generar web — endpoint principal
app.post('/generate', async (req, res) => {
  const { businessName, sector, city, webType, pages, colors } = req.body;

  if (!businessName || !webType) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios: businessName y webType',
    });
  }

  const taskType = webType === 'ecommerce'
    ? 'generate_ecommerce'
    : webType === 'dinamica'
    ? 'generate_web_dinamica'
    : 'generate_web_corporativa';

  const routing = await routeModel(taskType);

  res.json({
    status: 'queued',
    message: `Web para "${businessName}" en cola de generación`,
    routing,
    params: { businessName, sector, city, webType, pages, colors },
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Servidor Avialo corriendo en http://localhost:${PORT}`);
  console.log(`   GET  /health`);
  console.log(`   GET  /route/:taskType`);
  console.log(`   POST /classify`);
  console.log(`   POST /generate\n`);
});