import { Router } from 'express';
import { auth } from './auth.js';
import { shopAssistant } from '../lib/shopAssistant.js';
import { askKnowledge } from '../lib/knowledge.js';

const r = Router();

r.post('/shop', auth(false), async (req, res) => {
  const { message, history, lastFilters } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'Please type what you are looking for' });
  res.json(await shopAssistant({ message: String(message).slice(0, 500), history, lastFilters, user: req.user || null }));
});

r.post('/ask', async (req, res) => {
  const { question } = req.body || {};
  if (!question || !String(question).trim()) return res.status(400).json({ error: 'Please type a question' });
  res.json(await askKnowledge(String(question).slice(0, 400)));
});

export default r;
