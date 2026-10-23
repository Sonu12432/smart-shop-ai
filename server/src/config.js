import 'dotenv/config';
import dns from 'node:dns';

// Atlas "mongodb+srv" needs a DNS SRV lookup; some networks refuse it, so use public DNS.
dns.setServers((process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map((s) => s.trim()));

const e = process.env;
const enc = encodeURIComponent;

export const config = {
  port: Number(e.PORT) || 5000,
  jwtSecret: e.JWT_SECRET || 'dev-secret',
  geminiKey: e.GEMINI_API_KEY || '',
  geminiModel: e.GEMINI_MODEL || 'gemini-2.5-flash',
  mongoHost: e.MONGO_HOST || '',
  mongoUri:
    e.MONGODB_URI ||
    `mongodb+srv://${enc(e.MONGO_USER || '')}:${enc(e.MONGO_PASSWORD || '')}@${e.MONGO_HOST}/${e.MONGO_DB || 'shopsmart'}?retryWrites=true&w=majority&appName=ShopSmartAI`,
};

export const mongoConfigured = () =>
  Boolean(e.MONGODB_URI) || (e.MONGO_HOST && !e.MONGO_HOST.startsWith('REPLACE'));