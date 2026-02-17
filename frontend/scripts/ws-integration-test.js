// Simple integration test: two WS clients connect, start a game, and client1 makes a move.
// Usage: node scripts/ws-integration-test.js

const WebSocket = require('ws');

const URL = 'ws://localhost:8080';

function makeClient(name) {
  const ws = new WebSocket(URL);
  ws.on('open', () => {
    console.log(`${name} open`);
    ws.send(JSON.stringify({ type: 'init_game' }));
  });
  ws.on('message', (data) => {
    console.log(`${name} <-`, data.toString());
  });
  ws.on('close', () => console.log(`${name} closed`));
  ws.on('error', (e) => console.log(`${name} error`, e.message));
  return ws;
}

(async () => {
  const c1 = makeClient('C1');
  const c2 = makeClient('C2');

  // wait for both to be ready
  await new Promise((r) => setTimeout(r, 800));

  // send a legal opening move: e2 to e4
  console.log('C1 -> move e2->e4');
  c1.send(JSON.stringify({ type: 'move', payload: { from: 'e2', to: 'e4' } }));

  // wait for messages to propagate
  await new Promise((r) => setTimeout(r, 800));

  c1.close();
  c2.close();
})();
