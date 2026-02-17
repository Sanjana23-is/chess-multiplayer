#!/usr/bin/env node
// Small connectivity check for WebSocket endpoints (ws:// or wss://)
// Usage: node scripts/ws-check.js <wsUrl>
// Examples:
//   node scripts/ws-check.js ws://localhost:8080/
//   node scripts/ws-check.js wss://example.com/socket

const net = require('net');
const tls = require('tls');
const { URL } = require('url');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/ws-check.js <ws://host:port/path>');
  process.exit(2);
}

const raw = process.argv[2];
let url;
try {
  url = new URL(raw);
} catch (e) {
  console.error('Invalid URL:', raw);
  process.exit(2);
}

const isSecure = url.protocol === 'wss:';
const host = url.hostname;
const port = url.port || (isSecure ? 443 : 80);
const path = url.pathname + (url.search || '');

const start = Date.now();
let connectedAt = null;
let firstDataAt = null;
let timedOut = false;

function makeKey() {
  return Buffer.from(Math.random().toString()).toString('base64');
}

const req = [];
req.push(`GET ${path} HTTP/1.1`);
req.push(`Host: ${host}${url.port ? `:${url.port}` : ''}`);
req.push('Upgrade: websocket');
req.push('Connection: Upgrade');
req.push(`Sec-WebSocket-Key: ${makeKey()}`);
req.push('Sec-WebSocket-Version: 13');
req.push('\r\n');
const reqStr = req.join('\r\n');

const connOpts = { host, port: Number(port), servername: host };
const timeoutMs = 8000;
let gotData = false;

function onConnect(socket) {
  connectedAt = Date.now();
  console.log('TCP/TLS connected to', host + ':' + port, `(${connectedAt - start}ms)`);
  socket.setTimeout(timeoutMs, () => {
    timedOut = true;
    console.error('Timed out waiting for response (no data within', timeoutMs, 'ms)');
    socket.destroy();
    process.exitCode = 3;
  });

  socket.once('data', (chunk) => {
    firstDataAt = Date.now();
    gotData = true;
    console.log('Received data after', firstDataAt - connectedAt, 'ms');
    const text = chunk.toString('utf8');
    console.log('\n----- RESPONSE START -----\n');
    console.log(text);
    console.log('\n----- RESPONSE END -----\n');

    if (/HTTP\/[0-9\.]+\s+101\s+/i.test(text)) {
      console.log('Server replied with HTTP 101 Switching Protocols — WebSocket upgrade likely successful.');
      process.exitCode = 0;
    } else {
      console.warn('Server did not return 101. Response indicates handshake failed or proxy returned non-upgrade response.');
      process.exitCode = 4;
    }

    socket.destroy();
  });

  socket.write(reqStr);
}

if (isSecure) {
  const socket = tls.connect({ ...connOpts, rejectUnauthorized: false }, function() {
    if (!socket.authorized) {
      console.warn('TLS: connection established but certificate is not authorized (rejectUnauthorized=false).');
    }
    onConnect(socket);
  });
  socket.on('error', (err) => {
    console.error('Connection error:', err.message);
    process.exitCode = 5;
  });
} else {
  const socket = net.connect(connOpts, function() {
    onConnect(socket);
  });
  socket.on('error', (err) => {
    console.error('Connection error:', err.message);
    process.exitCode = 5;
  });
}

// Final timeout to avoid hanging forever
setTimeout(() => {
  if (!gotData && !timedOut) {
    console.error('No response received within overall timeout (', timeoutMs + 2000, 'ms ).');
    process.exitCode = 6;
    process.exit();
  }
}, timeoutMs + 2000);
