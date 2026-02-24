import * as net from 'net';
import * as tls from 'tls';
import { URL } from 'url';

if (process.argv.length < 3) {
  console.error('Usage: ts-node scripts/ws-check.ts <ws://host:port/path>');
  process.exit(2);
}

const raw = process.argv[2];
let url: URL;
try {
  url = new URL(raw);
} catch {
  console.error('Invalid URL:', raw);
  process.exit(2);
}

const isSecure = url.protocol === 'wss:';
const host = url.hostname;
const port = url.port || (isSecure ? '443' : '80');
const path = url.pathname + (url.search || '');

const start = Date.now();
let connectedAt: number | null = null;
let firstDataAt: number | null = null;
let timedOut = false;

function makeKey() {
  return Buffer.from(Math.random().toString()).toString('base64');
}

const req: string[] = [];
req.push(`GET ${path} HTTP/1.1`);
req.push(`Host: ${host}${url.port ? `:${url.port}` : ''}`);
req.push('Upgrade: websocket');
req.push('Connection: Upgrade');
req.push(`Sec-WebSocket-Key: ${makeKey()}`);
req.push('Sec-WebSocket-Version: 13');
req.push('\r\n');
const reqStr = req.join('\r\n');

const portNum = Number(port);
const timeoutMs = 8000;
let gotData = false;

function onConnect(socket: net.Socket | tls.TLSSocket) {
  connectedAt = Date.now();
  console.log('TCP/TLS connected to', host + ':' + portNum, `(${connectedAt - start}ms)`);
  socket.setTimeout(timeoutMs, () => {
    timedOut = true;
    console.error('Timed out waiting for response (no data within', timeoutMs, 'ms)');
    socket.destroy();
    process.exitCode = 3;
  });

  socket.once('data', (chunk: Buffer) => {
    firstDataAt = Date.now();
    gotData = true;
    console.log('Received data after', firstDataAt - (connectedAt ?? firstDataAt), 'ms');
    const text = chunk.toString('utf8');
    console.log('\n----- RESPONSE START -----\n');
    console.log(text);
    console.log('\n----- RESPONSE END -----\n');

    if (/HTTP\/[0-9.]+\s+101\s+/i.test(text)) {
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
  const socket = tls.connect({ host, port: portNum, servername: host, rejectUnauthorized: false }, function (this: tls.TLSSocket) {
    if (!this.authorized) {
      console.warn('TLS: connection established but certificate is not authorized (rejectUnauthorized=false).');
    }
    onConnect(this);
  });
  socket.on('error', (err: unknown) => {
    console.error('Connection error:', err);
    process.exitCode = 5;
  });
} else {
  const socket = net.connect({ host, port: portNum } as net.TcpSocketConnectOpts, function (this: net.Socket) {
    onConnect(this);
  });
  socket.on('error', (err: unknown) => {
    console.error('Connection error:', err);
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
