import { getBusiness } from './businesses.js';

const intentRules = [
  ['greeting', /\b(hello|hi|hey|salam|assalam|aoa)\b/i],
  ['hours', /\b(open|close|closing|timing|hours|kab khul|kab band)\b/i],
  ['location', /\b(where|location|address|kidhar|kahan)\b/i],
  ['price', /\b(price|cost|rate|budget|kitn|charges?)\b/i],
  ['booking', /\b(book|booking|reserve|reservation|appointment|visit|viewing|table)\b/i],
  ['services', /\b(service|offer|menu|food|property|properties|deliver|facility|available)\b/i],
  ['human', /\b(agent|person|human|manager|staff|representative|baat kar)\b/i],
  ['thanks', /\b(thanks|thank you|shukriya|jazakallah)\b/i]
];

export function detectIntent(message = '') {
  return intentRules.find(([, pattern]) => pattern.test(message))?.[0] || 'general';
}

export function detectRomanUrdu(message = '') {
  return /\b(kya|hai|hain|ka|ki|ke|kab|kahan|kidhar|chahye|karna|batao|kitn|mujhe|ap)\b/i.test(message);
}

export function createFallbackReply(message, businessId = 'cafe') {
  const business = getBusiness(businessId);
  const intent = detectIntent(message);
  const roman = detectRomanUrdu(message);

  const replies = {
    greeting: roman
      ? `Assalam o Alaikum! Main ${business.name} ka AI assistant hoon. Aap kis cheez mein help chahte hain?`
      : `Hello! I’m the AI assistant for ${business.name}. How can I help you today?`,
    hours: roman ? `${business.name} ke timings: ${business.hours}.` : `${business.name} is open ${business.hours}.`,
    location: roman ? `Hum ${business.location} par hain.` : `We are located at ${business.location}.`,
    price: roman ? `${business.prices} Apna budget batayein to main behtar guide kar sakta hoon.` : `${business.prices} Share your budget and I can guide you more precisely.`,
    booking: roman ? `${business.booking} Details batayein aur team confirmation karegi.` : `${business.booking}`,
    services: roman ? `Hum ${business.services.join(', ')} offer karte hain. Highlights: ${business.highlights.join(', ')}.` : `We offer ${business.services.join(', ')}. Highlights include ${business.highlights.join(', ')}.`,
    human: roman ? `Bilkul. Main aapki request staff ko forward kar sakta hoon. Contact: ${business.phone}.` : `Certainly. I can flag this for a team member. You can also call ${business.phone}.`,
    thanks: roman ? 'Khushi hui help karke. Kya main aur kuch bata sakta hoon?' : 'You’re welcome. Is there anything else I can help with?',
    general: roman ? `${business.fallback} Apna sawal thora detail mein batayein.` : `${business.fallback} Please share a little more detail.`
  };

  return { text: replies[intent], intent, source: 'local-engine' };
}

export function buildSystemPrompt(businessId = 'cafe') {
  const business = getBusiness(businessId);
  return `You are a concise, warm phone assistant for ${business.name}, a ${business.type} business.
Only use these verified facts:
- Location: ${business.location}
- Hours: ${business.hours}
- Services: ${business.services.join(', ')}
- Highlights: ${business.highlights.join(', ')}
- Pricing guidance: ${business.prices}
- Booking process: ${business.booking}
- Contact: ${business.phone}

Rules: keep answers under 55 words, never invent availability or prices, ask one question at a time, mirror English or Roman Urdu, and offer a human handoff when uncertain.`;
}
