import express from 'express';
import cors from 'cors';
import { routeModel, routeUnknownTask } from './models/router.js';
import { SYSTEM_PROMPT, isOutOfScope } from './prompts/system-base.js';
import { scaffoldProject } from './scaffolding/scaffold.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'avialo-builder-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/route/:taskType', async (req, res) => {
  const result = await routeModel(req.params.taskType);
  res.json(result);
});

app.post('/classify', async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Falta el campo description' });
  }
  const result = await routeUnknownTask(description);
  res.json(result);
});

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Falta el campo message' });
  }
  if (isOutOfScope(message)) {
    return res.json({
      blocked: true,
      response: 'Eso está fuera de mi área. El equipo de Avialo puede ayudarte en hola@avialo.es',
    });
  }
  const routing = await routeModel('chat_support');
  res.json({
    blocked: false,
    routing,
    systemPromptLength: SYSTEM_PROMPT.length,
    message: `Mensaje en scope — se procesaría con ${routing.modelId}`,
  });
});

app.post('/generate', async (req, res) => {
  const { businessName, sector, city, webType, pages, colors, primaryColor } = req.body;

  if (!businessName || !webType) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios: businessName y webType',
    });
  }

  const clienteId = `${businessName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

  const scaffold = await scaffoldProject(clienteId, {
    webType, businessName, sector, city, pages, primaryColor,
  });

  if (!scaffold.success) {
    return res.json({
      status: 'pending',
      reason: scaffold.reason,
      note: scaffold.note || null,
      clienteId,
    });
  }

  const taskType = webType === 'ecommerce'
    ? 'generate_ecommerce'
    : webType === 'dinamica'
    ? 'generate_web_dinamica'
    : 'generate_web_corporativa';

  const routing = await routeModel(taskType);

  res.json({
    status: 'ready_for_generation',
    clienteId,
    dominio: scaffold.dominio,
    scaffold: {
      base: scaffold.base,
      filesCreated: ['index.html', 'sitemap.xml', 'robots.txt', 'avialo-meta.json'],
    },
    routing,
    next: 'IA generará el contenido sobre la plantilla base',
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Servidor Avialo corriendo en http://localhost:${PORT}`);
  console.log(`   GET  /health`);
  console.log(`   GET  /route/:taskType`);
  console.log(`   POST /classify`);
  console.log(`   POST /chat`);
  console.log(`   POST /generate\n`);
});