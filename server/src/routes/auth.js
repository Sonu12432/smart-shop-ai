import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models.js';

const r = Router();
const sign = (u) => jwt.sign({ id: u._id }, config.jwtSecret, { expiresIn: '7d' });
export const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, tier: u.tier, preferences: u.preferences });

export const auth = (required = true) => async (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return required ? res.status(401).json({ error: 'Please log in' }) : next();
  try {
    const { id } = jwt.verify(token, config.jwtSecret);
    req.user = await User.findById(id);
    if (!req.user && required) return res.status(401).json({ error: 'Please log in' });
    next();
  } catch {
    return required ? res.status(401).json({ error: 'Session expired, please log in again' }) : next();
  }
};

r.post('/register', async (req, res) => {
  const { name, email, password, tier } = req.body || {};
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and a 6+ character password are required' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), tier: ['Basic', 'Prime', 'Premium'].includes(tier) ? tier : 'Basic' });
  res.json({ token: sign(user), user: publicUser(user) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(user), user: publicUser(user) });
});

r.get('/me', auth(), (req, res) => res.json({ user: publicUser(req.user) }));

r.put('/preferences', auth(), async (req, res) => {
  const { budget, brands, categories } = req.body || {};
  req.user.preferences = { budget: Number(budget) || undefined, brands: brands || [], categories: categories || [] };
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

export default r;
