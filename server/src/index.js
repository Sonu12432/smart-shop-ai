import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config, mongoConfigured } from './config.js';
import { geminiEnabled } from './lib/gemini.js';
import { seedAll } from './seed/run.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import userRoutes from './routes/userdata.js';
import aiRoutes from './routes/ai.js';

// Express 4 doesn't catch async errors by itself; wrap handlers so a failure returns JSON instead of hanging.
const wrap = (router) => {
  router.stack.forEach((layer) => {
    if (layer.route) layer.route.stack.forEach((l) => {
      const fn = l.handle;
      if (fn.length <= 2) l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    });
  });
  return router;
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1, gemini: geminiEnabled(), model: config.geminiModel }));
app.use('/api/auth', wrap(authRoutes));
app.use('/api/products', wrap(productRoutes));
app.use('/api', wrap(userRoutes));
app.use('/api/ai', wrap(aiRoutes));

// Serve the built React app when present (single-port demo: `npm run build && npm start`).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

async function start() {
  if (!mongoConfigured()) {
    console.error('\n✖ MongoDB host missing. Open server/.env and replace MONGO_HOST=REPLACE_WITH_CLUSTER_HOST\n  with your Atlas cluster host (e.g. cluster0.ab1cd.mongodb.net), or paste a full MONGODB_URI.\n');
    process.exit(1);
  }
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 12000 });
    console.log('✔ MongoDB connected');
    await seedAll();
  } catch (err) {
    console.error('\n✖ Could not connect to MongoDB:', err.message);
    console.error('  Check: (1) MONGO_HOST is correct, (2) Atlas > Network Access allows your IP (or 0.0.0.0/0 for the demo), (3) username/password are right.\n');
    process.exit(1);
  }
  console.log(geminiEnabled() ? `✔ Gemini enabled (${config.geminiModel})` : '⚠ GEMINI_API_KEY missing - assistant will use the offline fallback parser');
  app.listen(config.port, () => console.log(`✔ API running on http://localhost:${config.port}`));
}
start();
