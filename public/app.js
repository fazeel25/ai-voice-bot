const businessProfiles = {
  cafe: { name: 'Northstar Café', facts: ['Open daily, 8 AM–11 PM', 'Main Boulevard, Karachi', 'Dine-in, takeaway & delivery', 'Reservations supported'], prompts: ['What time do you close?', 'Can I book a table?', 'Where are you located?'] },
  restaurant: { name: 'Saffron Table', facts: ['Open daily, 12 PM–12 AM', 'Clifton, Karachi', 'Pakistani cuisine & BBQ', 'Events and family seating'], prompts: ['Do you take reservations?', 'What food do you serve?', 'Can I book an event?'] },
  realestate: { name: 'Vertex Homes', facts: ['Mon–Sat, 9 AM–7 PM', 'Shahrah-e-Faisal, Karachi', 'Buy, rent and sell', 'Verified listings & viewings'], prompts: ['I need a 2-bed apartment', 'Book a property viewing', 'What areas do you cover?'] }
};

const localAnswers = {
  cafe: ['I can help with timings, menu, prices, location, delivery and reservations.', 'Northstar Café is open daily from 8 AM to 11 PM.', 'Share your name, preferred time and number of guests and the team will confirm your table.'],
  restaurant: ['I can help with the menu, reservations, family seating, delivery and events.', 'Saffron Table is open daily from 12 PM to 12 AM.', 'Share the date, time and party size and our team will confirm your reservation.'],
  realestate: ['Tell me your preferred area, budget and number of bedrooms and I will qualify the request.', 'Vertex Homes is open Monday to Saturday, 9 AM to 7 PM.', 'Share your area, budget and preferred time and an agent will confirm a viewing.']
};

const state = { businessId: 'cafe', language: 'en-US', count: 0, messages: [], startedAt: Date.now(), listening: false };
const conversation = document.querySelector('#conversation');
const composer = document.querySelector('#composer');
const input = document.querySelector('#messageInput');
const micButton = document.querySelector('#micButton');
const voiceNote = document.querySelector('#voiceNote');
const quickPrompts = document.querySelector('#quickPrompts');

function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }

function addMessage(role, text) {
  const label = role === 'assistant' ? 'VOXA' : 'CUSTOMER';
  conversation.insertAdjacentHTML('beforeend', `<div class="message ${role}"><span>${label}</span><p>${escapeHtml(text)}</p></div>`);
  conversation.scrollTop = conversation.scrollHeight;
  state.messages.push({ role, text, timestamp: new Date().toISOString() });
}

function updateIntent(intent = 'general', source = 'local-engine') {
  document.querySelector('#intentValue').textContent = intent.replace('-', ' ');
  document.querySelector('#confidenceBar').style.width = `${intent === 'general' ? 64 : 92}%`;
  document.querySelector('#sourceValue').textContent = source === 'openai' ? 'OpenAI intelligence' : 'Local intelligence';
}

function localReply(message) {
  const lower = message.toLowerCase();
  const set = localAnswers[state.businessId];
  if (/open|close|time|timing|kab/.test(lower)) return { text: set[1], intent: 'hours', source: 'local-engine' };
  if (/book|reserve|appointment|viewing|table/.test(lower)) return { text: set[2], intent: 'booking', source: 'local-engine' };
  if (/where|location|address|kahan|kidhar/.test(lower)) return { text: businessProfiles[state.businessId].facts[1], intent: 'location', source: 'local-engine' };
  return { text: set[0], intent: 'general', source: 'local-engine' };
}

async function ask(message) {
  addMessage('user', message);
  input.value = '';
  document.querySelector('#intentValue').textContent = 'Thinking';
  document.querySelector('#intentValue').classList.add('loading');
  let data;
  try {
    const response = await fetch('api/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, businessId: state.businessId }) });
    if (!response.ok) throw new Error('Demo API unavailable');
    data = await response.json();
  } catch { data = localReply(message); }
  document.querySelector('#intentValue').classList.remove('loading');
  addMessage('assistant', data.text);
  state.count += 1;
  document.querySelector('#conversationCount').textContent = state.count;
  updateIntent(data.intent, data.source);
  speak(data.text);
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language;
  utterance.rate = 1.02;
  speechSynthesis.speak(utterance);
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = Recognition ? new Recognition() : null;
if (recognition) {
  recognition.interimResults = false;
  recognition.onresult = (event) => ask(event.results[0][0].transcript);
  recognition.onend = () => { state.listening = false; micButton.classList.remove('listening'); voiceNote.textContent = 'Voice captured. Text mode is also available.'; };
  recognition.onerror = () => { voiceNote.textContent = 'Microphone could not start. Please type your question instead.'; };
} else voiceNote.textContent = 'Voice input is not supported in this browser. Text mode is ready.';

micButton.addEventListener('click', () => {
  if (!recognition) return input.focus();
  state.listening = true; recognition.lang = state.language; recognition.start(); micButton.classList.add('listening'); voiceNote.textContent = 'Listening… ask your question now.';
});

composer.addEventListener('submit', (event) => { event.preventDefault(); const message = input.value.trim(); if (message) ask(message); });
quickPrompts.addEventListener('click', (event) => { if (event.target.matches('button')) ask(event.target.textContent); });

document.querySelector('#businessSelect').addEventListener('change', (event) => {
  state.businessId = event.target.value;
  const profile = businessProfiles[state.businessId];
  document.querySelector('#businessTitle').textContent = profile.name;
  document.querySelector('#knowledgeList').innerHTML = profile.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('');
  quickPrompts.innerHTML = profile.prompts.map((prompt) => `<button>${escapeHtml(prompt)}</button>`).join('');
  addMessage('assistant', `${profile.name} profile loaded. How can I help?`);
});

document.querySelector('#languageSelect').addEventListener('change', (event) => { state.language = event.target.value; });
document.querySelector('#themeButton').addEventListener('click', () => document.body.classList.toggle('light'));
document.querySelector('#exportButton').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ business: state.businessId, exportedAt: new Date().toISOString(), messages: state.messages }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `voxa-transcript-${Date.now()}.json`; link.click(); URL.revokeObjectURL(link.href);
});

setInterval(() => {
  const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
  document.querySelector('#sessionTime').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}, 1000);
