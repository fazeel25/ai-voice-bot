import test from 'node:test';
import assert from 'node:assert/strict';
import { createFallbackReply, detectIntent, detectRomanUrdu } from '../src/assistant.js';

test('detects common business intents', () => {
  assert.equal(detectIntent('What time do you close?'), 'hours');
  assert.equal(detectIntent('Can I book a viewing?'), 'booking');
  assert.equal(detectIntent('Where are you located?'), 'location');
});

test('detects Roman Urdu', () => {
  assert.equal(detectRomanUrdu('Aap kab band hotay hain?'), true);
});

test('returns a verified business response', () => {
  const response = createFallbackReply('What time do you close?', 'cafe');
  assert.match(response.text, /8 AM to 11 PM/);
  assert.equal(response.source, 'local-engine');
});
