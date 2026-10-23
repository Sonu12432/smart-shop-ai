import { KnowledgeDoc } from '../models.js';
import { gemini, geminiEnabled } from './gemini.js';

const STOP = new Set('a an the is are was were be can could i my me we you your do does did to of for in on at by with and or if it this that what when how which will would after before from as about'.split(' '));
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);
const tokens = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);

// Lexical retrieval over policy sections. (Swap for embeddings + a vector index to scale up.)
async function retrieve(question, k = 3) {
  const q = tokens(question);
  const chunks = await KnowledgeDoc.find().lean();
  return chunks
    .map((c) => {
      const head = new Set(tokens(`${c.document} ${c.section} ${c.category}`));
      const body = tokens(c.text);
      let score = 0;
      for (const t of q) score += (head.has(t) ? 3 : 0) + Math.min(body.filter((b) => b === t).length, 3);
      return { ...c, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export async function askKnowledge(question) {
  const hits = await retrieve(question);
  if (!hits.length) {
    return { answer: "I couldn't find this in the approved policy documents. Please contact ShopSmart support for help.", confidence: 'LOW', sources: [], followUpRequired: true, engine: 'none' };
  }
  const src = (h) => ({ document: h.document, section: h.section, version: h.version });

  if (geminiEnabled()) {
    try {
      const out = await gemini({
        system: `You are ShopSmart's policy assistant. Answer ONLY from the provided context passages. If the answer is not in the context, say you don't have that information and set followUpRequired true.
Return ONLY JSON: {"answer":string,"confidence":"HIGH"|"MEDIUM"|"LOW","usedSources":number[],"followUpRequired":boolean}
"usedSources" are the indexes of the passages you actually used. Keep the answer under 60 words.`,
        prompt: `Context passages:\n${hits.map((h, i) => `[${i}] ${h.document} / ${h.section} (v${h.version}): ${h.text}`).join('\n')}\n\nQuestion: ${question}`,
        temperature: 0.1,
      });
      const used = (out.usedSources || []).filter((i) => hits[i]);
      return {
        answer: String(out.answer || ''),
        confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(out.confidence) ? out.confidence : 'MEDIUM',
        sources: (used.length ? used.map((i) => hits[i]) : hits.slice(0, 1)).map(src),
        followUpRequired: Boolean(out.followUpRequired),
        engine: 'gemini',
      };
    } catch (err) {
      console.warn('[knowledge] Gemini failed, returning top passage:', err.message);
    }
  }
  return { answer: hits[0].text, confidence: hits[0].score >= 6 ? 'MEDIUM' : 'LOW', sources: [src(hits[0])], followUpRequired: false, engine: 'fallback' };
}
