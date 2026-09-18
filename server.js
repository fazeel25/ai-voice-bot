import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import twilio from 'twilio';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSystemPrompt, createFallbackReply, detectIntent } from './src/assistant.js';
import { getBusiness, businesses } from './src/businesses.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public', { extensions: ['html'], maxAge: '1h' }));

export async function answer(message, businessId) {
  const fallback = createFallbackReply(message, businessId);
  if (!openai) return fallback;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 130,
      messages: [
        { role: 'system', content: buildSystemPrompt(businessId) },
        { role: 'user', content: message }
      ]
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return { text: text || fallback.text, intent: detectIntent(message), source: text ? 'openai' : fallback.source };
  } catch (error) {
    console.error('OpenAI fallback:', error.message);
    return fallback;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: Boolean(openai), businesses: Object.keys(businesses), time: new Date().toISOString() });
});

app.get('/api/businesses', (_req, res) => {
  res.json(Object.values(businesses));
});

app.post('/api/respond', async (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 800);
  const businessId = String(req.body?.businessId || process.env.DEFAULT_BUSINESS || 'cafe');
  if (!message) return res.status(400).json({ error: 'A message is required.' });
  const result = await answer(message, businessId);
  res.json({ ...result, business: getBusiness(businessId).name });
});

app.post('/api/twilio/voice', (req, res) => {
  const businessId = String(req.query.business || process.env.DEFAULT_BUSINESS || 'cafe');
  const business = getBusiness(businessId);
  const response = new twilio.twiml.VoiceResponse();
  const gather = response.gather({ input: 'speech', speechTimeout: 'auto', action: `/api/twilio/process?business=${business.id}`, method: 'POST' });
  gather.say({ voice: 'alice' }, `Welcome to ${business.name}. How can I help you today?`);
  response.redirect({ method: 'POST' }, `/api/twilio/voice?business=${business.id}`);
  res.type('text/xml').send(response.toString());
});

app.post('/api/twilio/process', async (req, res) => {
  const businessId = String(req.query.business || process.env.DEFAULT_BUSINESS || 'cafe');
  const speech = String(req.body?.SpeechResult || '');
  const result = await answer(speech, businessId);
  const response = new twilio.twiml.VoiceResponse();
  response.say({ voice: 'alice' }, result.text);
  const gather = response.gather({ input: 'speech', speechTimeout: 'auto', action: `/api/twilio/process?business=${businessId}`, method: 'POST' });
  gather.say({ voice: 'alice' }, 'What else can I help you with?');
  res.type('text/xml').send(response.toString());
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

export { app };

const launchedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (launchedDirectly) {
  app.listen(port, () => {
    console.log(`AI Voice Bot running on http://localhost:${port}`);
  });
}
