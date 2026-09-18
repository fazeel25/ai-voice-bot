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

const state = { businessId: 'cafe', language: 'en-US', count: 0, messages: [], startedAt: Date.now(), listening: false, lastAnswer: '' };
const conversation = document.querySelector('#conversation');
const composer = document.querySelector('#composer');
const input = document.querySelector('#messageInput');
const micButton = document.querySelector('#micButton');
const startCallButton = document.querySelector('#startCallButton');
const callStatus = document.querySelector('#callStatus');
const voiceNote = document.querySelector('#voiceNote');
const quickPrompts = document.querySelector('#quickPrompts');
const repeatButton = document.querySelector('#repeatButton');
const engineStatus = document.querySelector('#engineStatus');

function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }

function setStatus(label, active) {
  callStatus.querySelector('strong').textContent = label;
  callStatus.classList.toggle('active', Boolean(active));
  startCallButton.classList.toggle('listening', label === 'Listening…');
  document.querySelector('#intentValue').textContent = label.replace('…', '');
}

function addMessage(role, text) {
  const label = role === 'assistant' ? 'VOXA' : 'YOU';
  conversation.insertAdjacentHTML('beforeend', '<div class="message ' + role + '"><span>' + label + '</span><p>' + escapeHtml(text) + '</p></div>');
  conversation.scrollTop = conversation.scrollHeight;
  state.messages.push({ role, text, timestamp: new Date().toISOString() });
}

function updateIntent(intent = 'general', source = 'local-engine') {
  document.querySelector('#intentValue').textContent = intent.replace('-', ' ');
  document.querySelector('#confidenceBar').style.width = intent === 'general' ? '64%' : '92%';
  document.querySelector('#sourceValue').textContent = source === 'openai' ? 'Answered with connected AI' : 'Answered with demo knowledge';
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
  if (!message) return;
  addMessage('user', message);
  input.value = '';
  setStatus('Thinking…', true);
  let data;
  try {
    const response = await fetch('api/respond', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, businessId: state.businessId }) });
    if (!response.ok) throw new Error('Demo API unavailable');
    data = await response.json();
  } catch {
    data = localReply(message);
  }
  addMessage('assistant', data.text);
  state.lastAnswer = data.text;
  repeatButton.disabled = false;
  state.count += 1;
  document.querySelector('#conversationCount').textContent = state.count;
  updateIntent(data.intent, data.source);
  setStatus('Speaking…', true);
  speak(data.text);
}

function chooseVoice() {
  const voices = speechSynthesis.getVoices();
  const exact = voices.find((voice) => voice.lang === state.language);
  const languageFamily = voices.find((voice) => voice.lang.toLowerCase().startsWith(state.language.slice(0, 2).toLowerCase()));
  return exact || languageFamily || voices.find((voice) => /female|zira|samantha|google uk english female/i.test(voice.name)) || voices[0];
}

function speak(text) {
  if (!('speechSynthesis' in window)) {
    setStatus('Answer ready', false);
    voiceNote.textContent = 'Audio playback is unavailable in this browser. Read the answer above.';
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language;
  utterance.rate = state.language === 'ur-PK' ? 0.9 : 0.96;
  utterance.pitch = 1;
  const voice = chooseVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = () => { setStatus('Ready for another question', false); };
  utterance.onerror = () => { setStatus('Answer ready', false); };
  speechSynthesis.speak(utterance);
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = Recognition ? new Recognition() : null;

function startListening() {
  if (!recognition) {
    input.focus();
    setStatus('Type your question below', false);
    voiceNote.textContent = 'Voice input is not supported here. Type a question and press Send.';
    return;
  }
  try {
    speechSynthesis.cancel();
    recognition.lang = state.language;
    recognition.start();
    state.listening = true;
    micButton.classList.add('listening');
    setStatus('Listening…', true);
    voiceNote.textContent = 'Speak now. Voxa will show the words it hears.';
    startCallButton.innerHTML = '<span>●</span> Listening…';
  } catch {
    voiceNote.textContent = 'Microphone is already active. Please speak now.';
  }
}

if (recognition) {
  engineStatus.textContent = 'Ready — press Start';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join('');
    input.value = transcript;
    if (event.results[event.results.length - 1].isFinal) ask(transcript);
  };
  recognition.onend = () => {
    state.listening = false;
    micButton.classList.remove('listening');
    startCallButton.innerHTML = '<span>●</span> Start Voice Demo';
    if (callStatus.querySelector('strong').textContent === 'Listening…') setStatus('Ready — press again', false);
  };
  recognition.onerror = (event) => {
    state.listening = false;
    micButton.classList.remove('listening');
    startCallButton.innerHTML = '<span>●</span> Start Voice Demo';
    const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
    setStatus(denied ? 'Microphone blocked' : 'Please try again', false);
    voiceNote.textContent = denied ? 'Click the lock icon near the address bar, allow Microphone, then try again.' : 'I could not hear that. Press Start Voice Demo and speak again.';
  };
} else {
  engineStatus.textContent = 'Text mode available';
  voiceNote.textContent = 'Voice input is not supported in this browser. Type your question below.';
}

startCallButton.addEventListener('click', startListening);
micButton.addEventListener('click', startListening);
repeatButton.addEventListener('click', () => { if (state.lastAnswer) speak(state.lastAnswer); });
composer.addEventListener('submit', (event) => { event.preventDefault(); const message = input.value.trim(); if (message) ask(message); });
quickPrompts.addEventListener('click', (event) => { if (event.target.matches('button')) ask(event.target.textContent); });

document.querySelector('#businessSelect').addEventListener('change', (event) => {
  state.businessId = event.target.value;
  const profile = businessProfiles[state.businessId];
  document.querySelector('#businessTitle').textContent = profile.name;
  document.querySelector('#knowledgeList').innerHTML = profile.facts.map((fact) => '<li>' + escapeHtml(fact) + '</li>').join('');
  quickPrompts.innerHTML = profile.prompts.map((prompt) => '<button>' + escapeHtml(prompt) + '</button>').join('');
  addMessage('assistant', profile.name + ' selected. Press Start Voice Demo and ask a question.');
});

document.querySelector('#languageSelect').addEventListener('change', (event) => {
  state.language = event.target.value;
  voiceNote.textContent = state.language === 'ur-PK' ? 'Roman Urdu mein bolain, misal: “Aap kab band hotay hain?”' : 'Tip: Ask “What time do you close?”';
});
document.querySelector('#themeButton').addEventListener('click', () => document.body.classList.toggle('light'));
document.querySelector('#exportButton').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ business: state.businessId, exportedAt: new Date().toISOString(), messages: state.messages }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'voxa-conversation-' + Date.now() + '.json';
  link.click();
  URL.revokeObjectURL(link.href);
});

if ('speechSynthesis' in window) speechSynthesis.getVoices();
setInterval(() => {
  const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
  document.querySelector('#sessionTime').textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
}, 1000);