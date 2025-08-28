#!/usr/bin/env node
import chalk from 'chalk';
import { io } from 'socket.io-client';

function parseArgs(argv) {
  const out = { url: 'http://localhost:9000', stream: undefined, events: [], withCredentials: true, duration: 0 };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--url' && argv[i + 1]) { out.url = argv[++i]; continue; }
    if ((arg === '--stream' || arg === '--room') && argv[i + 1]) { out.stream = argv[++i]; continue; }
    if (arg === '--event' && argv[i + 1]) { out.events.push(argv[++i]); continue; }
    if (arg === '--with-credentials') { out.withCredentials = true; continue; }
    if (arg === '--no-with-credentials') { out.withCredentials = false; continue; }
    if (arg === '--duration' && argv[i + 1]) { out.duration = Number(argv[++i]) || 0; continue; }
    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(`Usage: ws-pretty-log.mjs [options]\n\nOptions:\n  --url <url>                 Backend URL (default http://localhost:9000)\n  --stream <id>               Stream ID to join (alias: --room)\n  --event <name>              Extra event to listen to (repeatable)\n  --with-credentials          Send cookies (default)\n  --no-with-credentials       Do not send cookies\n  --duration <seconds>        Auto-exit after N seconds (default 0 = stay open)\n  -h, --help                  Show help\n`);
      process.exit(0);
    }
  }
  return out;
}

const opts = parseArgs(process.argv);
const backendUrl = opts.url;
const streamId = opts.stream;

const tag = (label, color) => chalk.bgHex(color).black(` ${label} `);
const time = () => chalk.gray(new Date().toLocaleTimeString());

const logSent = (event, data) => {
  console.log(`${time()} ${tag('SENT', '#60a5fa')} ${chalk.blue(event)}\n${chalk.dim(formatJSON(data))}`);
};
const logRecv = (event, data) => {
  console.log(`${time()} ${tag('RECV', '#34d399')} ${chalk.green(event)}\n${chalk.dim(formatJSON(data))}`);
};
const logSys = (event, data) => {
  console.log(`${time()} ${tag('SYS', '#e5e7eb')} ${chalk.white(event)}\n${chalk.dim(formatJSON(data))}`);
};
const logErr = (event, data) => {
  console.error(`${time()} ${tag('ERR', '#fca5a5')} ${chalk.red(event)}\n${chalk.dim(formatJSON(data))}`);
};

function formatJSON(obj) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return String(obj);
  }
}

const socket = io(backendUrl, { withCredentials: opts.withCredentials, transports: ['websocket'] });

socket.on('connect', () => {
  logSys('connected', { socketId: socket.id });
  // transport info
  try {
    const sAny = socket; // best-effort
    const transportName = sAny.io?.engine?.transport?.name;
    if (transportName) logSys('transport', { name: transportName });
  } catch {}

  if (streamId) {
    socket.emit('stream:join', { streamId });
    logSent('stream:join', { streamId });
  }
  if (opts.duration > 0) {
    setTimeout(() => {
      if (streamId) {
        socket.emit('stream:leave', { streamId });
        logSent('stream:leave', { streamId });
      }
      socket.disconnect();
      setTimeout(() => process.exit(0), 50);
    }, Math.max(1000, opts.duration * 1000));
  }
});

socket.on('disconnect', reason => logSys('disconnected', { reason }));
socket.on('connect_error', err => logErr('connect_error', { message: err?.message }));

// Core events
socket.on('stream:joined', d => logRecv('stream:joined', d));
socket.on('stream:left', d => logRecv('stream:left', d));
socket.on('stream:viewer:joined', d => logRecv('stream:viewer:joined', d));
socket.on('stream:viewer:left', d => logRecv('stream:viewer:left', d));
socket.on('chat:message', d => logRecv('chat:message', d));
socket.on('chat:message:sent', d => logRecv('chat:message:sent', d));
socket.on('chat:error', d => logErr('chat:error', d));

// Additional user-specified events
for (const ev of opts.events) {
  socket.on(String(ev), d => logRecv(String(ev), d));
}

// Graceful exit on SIGINT
process.on('SIGINT', () => {
  if (streamId) {
    socket.emit('stream:leave', { streamId });
    logSent('stream:leave', { streamId });
  }
  socket.disconnect();
  setTimeout(() => process.exit(0), 100);
});


