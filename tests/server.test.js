import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';

test('health endpoint and local response work', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const health = await fetch(`http://127.0.0.1:${port}/api/health`).then((response) => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.ai, false);

  const answer = await fetch(`http://127.0.0.1:${port}/api/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Where are you located?', businessId: 'realestate' })
  }).then((response) => response.json());

  assert.equal(answer.intent, 'location');
  assert.match(answer.text, /Shahrah-e-Faisal/);
});
