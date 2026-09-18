import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import twilio from 'twilio';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSystemPrompt, createFallbackReply, detectIntent } from './src/assistant.js';
import { getBusiness, businesses } from './src/businesses.js';
import { databaseEnabled, initialiseDatabase, query } from './src/database.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'local-development-secret-change-me');
if (!jwtSecret) throw new Error('JWT_SECRET is required in production.');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use(express.static('public', { extensions: ['html'], maxAge: '1h' }));

function tokenFor(user) { return jwt.sign({ sub: String(user.id), email: user.email }, jwtSecret, { expiresIn: '7d' }); }
function setSession(res, user) { res.cookie('voxa_session', tokenFor(user), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400_000 }); }
function requireUser(req, res, next) {
  try { const token = req.cookies.voxa_session; if (!token) throw new Error(); req.user = jwt.verify(token, jwtSecret); next(); }
  catch { res.status(401).json({ error: 'Please sign in.' }); }
}
function clean(value, max = 120) { return String(value || '').trim().slice(0, max); }
function validateEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function answer(message, businessId) {
  const fallback = createFallbackReply(message, businessId);
  if (!openai) return fallback;
  try {
    const completion = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.25, max_tokens: 160, messages: [{ role: 'system', content: buildSystemPrompt(businessId) }, { role: 'user', content: message }] });
    const text = completion.choices[0]?.message?.content?.trim();
    return { text: text || fallback.text, intent: detectIntent(message), source: text ? 'openai' : fallback.source };
  } catch (error) { console.error('OpenAI fallback:', error.message); return fallback; }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: Boolean(openai), database: databaseEnabled, time: new Date().toISOString() }));
app.get('/api/businesses', (_req, res) => res.json(Object.values(businesses)));
app.post('/api/respond', async (req, res) => {
  const message = clean(req.body?.message, 800); const businessId = clean(req.body?.businessId || 'cafe', 40);
  if (!message) return res.status(400).json({ error: 'A message is required.' });
  res.json({ ...(await answer(message, businessId)), business: getBusiness(businessId).name });
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = clean(req.body.name), email = clean(req.body.email).toLowerCase(), password = String(req.body.password || '');
    if (name.length < 2 || !validateEmail(email) || password.length < 8) return res.status(400).json({ error: 'Enter a valid name, email and password of at least 8 characters.' });
    const hash = await bcrypt.hash(password, 12);
    const client = await query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email', [name, email, hash]);
    const user = client.rows[0];
    await query("INSERT INTO businesses(owner_id,name,category) VALUES($1,$2,'salon')", [user.id, name + "'s Salon"]);
    setSession(res, user); res.status(201).json({ user });
  } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' }); next(error); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try { const email = clean(req.body.email).toLowerCase(); const found = await query('SELECT * FROM users WHERE email=$1', [email]); const user = found.rows[0]; if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' }); setSession(res, user); res.json({ user: { id: user.id, name: user.name, email: user.email } }); }
  catch (error) { next(error); }
});
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('voxa_session'); res.status(204).end(); });

app.get('/api/dashboard', requireUser, async (req, res, next) => {
  try {
    const business = (await query('SELECT * FROM businesses WHERE owner_id=$1', [req.user.sub])).rows[0];
    const services = (await query('SELECT * FROM services WHERE business_id=$1 ORDER BY id', [business.id])).rows;
    const bookings = (await query('SELECT * FROM bookings WHERE business_id=$1 ORDER BY booking_at DESC LIMIT 100', [business.id])).rows;
    res.json({ business, services, bookings });
  } catch (error) { next(error); }
});
app.patch('/api/business', requireUser, async (req, res, next) => {
  try { const values = ['name','category','phone','address','hours','language'].map((key) => clean(req.body[key], 200)); const result = await query('UPDATE businesses SET name=$1,category=$2,phone=$3,address=$4,hours=$5,language=$6,updated_at=NOW() WHERE owner_id=$7 RETURNING *', [...values, req.user.sub]); res.json(result.rows[0]); }
  catch (error) { next(error); }
});
app.post('/api/services', requireUser, async (req, res, next) => {
  try { const name = clean(req.body.name); const price = Number(req.body.pricePkr); const duration = Number(req.body.durationMinutes || 30); if (!name || !Number.isInteger(price) || price < 0) return res.status(400).json({ error: 'Valid service name and price are required.' }); const result = await query('INSERT INTO services(business_id,name,price_pkr,duration_minutes) SELECT id,$1,$2,$3 FROM businesses WHERE owner_id=$4 RETURNING *', [name, price, duration, req.user.sub]); res.status(201).json(result.rows[0]); }
  catch (error) { next(error); }
});
app.delete('/api/services/:id', requireUser, async (req, res, next) => {
  try { await query('DELETE FROM services USING businesses WHERE services.id=$1 AND services.business_id=businesses.id AND businesses.owner_id=$2', [req.params.id, req.user.sub]); res.status(204).end(); }
  catch (error) { next(error); }
});
app.post('/api/bookings', requireUser, async (req, res, next) => {
  try { const values = [clean(req.body.customerName), clean(req.body.customerPhone, 40), clean(req.body.serviceName), new Date(req.body.bookingAt), clean(req.body.notes, 500)]; if (!values[0] || !values[1] || !values[2] || Number.isNaN(values[3].getTime())) return res.status(400).json({ error: 'Complete booking details are required.' }); const result = await query('INSERT INTO bookings(business_id,customer_name,customer_phone,service_name,booking_at,notes) SELECT id,$1,$2,$3,$4,$5 FROM businesses WHERE owner_id=$6 RETURNING *', [...values, req.user.sub]); res.status(201).json(result.rows[0]); }
  catch (error) { next(error); }
});
app.patch('/api/bookings/:id', requireUser, async (req, res, next) => {
  try { const allowed = ['pending','confirmed','completed','cancelled']; const status = clean(req.body.status, 20); if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid booking status.' }); const result = await query('UPDATE bookings SET status=$1 FROM businesses WHERE bookings.id=$2 AND bookings.business_id=businesses.id AND businesses.owner_id=$3 RETURNING bookings.*', [status, req.params.id, req.user.sub]); res.json(result.rows[0]); }
  catch (error) { next(error); }
});
app.post('/api/subscription/payment-request', requireUser, async (req, res, next) => {
  try { const plan = clean(req.body.plan, 20), method = clean(req.body.method, 20), transactionId = clean(req.body.transactionId, 100); if (!['starter','pro'].includes(plan) || !['easypaisa','jazzcash'].includes(method) || transactionId.length < 4) return res.status(400).json({ error: 'Valid plan, method and transaction ID are required.' }); const result = await query('INSERT INTO payment_requests(business_id,plan,method,transaction_id) SELECT id,$1,$2,$3 FROM businesses WHERE owner_id=$4 RETURNING *', [plan, method, transactionId, req.user.sub]); res.status(201).json(result.rows[0]); }
  catch (error) { next(error); }
});

app.post('/api/twilio/voice', (req, res) => { const businessId = clean(req.query.business || 'cafe', 40); const business = getBusiness(businessId); const response = new twilio.twiml.VoiceResponse(); const gather = response.gather({ input: 'speech', speechTimeout: 'auto', action: '/api/twilio/process?business=' + business.id, method: 'POST' }); gather.say({ voice: 'alice' }, 'Welcome to ' + business.name + '. How can I help you today?'); response.redirect({ method: 'POST' }, '/api/twilio/voice?business=' + business.id); res.type('text/xml').send(response.toString()); });
app.post('/api/twilio/process', async (req, res) => { const businessId = clean(req.query.business || 'cafe', 40); const result = await answer(clean(req.body?.SpeechResult, 800), businessId); const response = new twilio.twiml.VoiceResponse(); response.say({ voice: 'alice' }, result.text); const gather = response.gather({ input: 'speech', speechTimeout: 'auto', action: '/api/twilio/process?business=' + businessId, method: 'POST' }); gather.say({ voice: 'alice' }, 'What else can I help you with?'); res.type('text/xml').send(response.toString()); });

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, _req, res, _next) => { console.error(error); res.status(error.status || 500).json({ error: error.status ? error.message : 'Something went wrong.' }); });

export { app };
const launchedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (launchedDirectly) initialiseDatabase().then(() => app.listen(port, () => console.log('Voxa Business running on http://localhost:' + port))).catch((error) => { console.error(error); process.exit(1); });
