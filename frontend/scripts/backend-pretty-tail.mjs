#!/usr/bin/env node
import { spawn } from 'node:child_process';
import chalk from 'chalk';

function parseArgs(argv) {
  const out = { file: '../backend/server.log', lines: 200, follow: true, width: 180, filter: '' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file' && argv[i + 1]) { out.file = argv[++i]; continue; }
    if (a === '--lines' && argv[i + 1]) { out.lines = Number(argv[++i]) || 200; continue; }
    if (a === '--no-follow') { out.follow = false; continue; }
    if (a === '--width' && argv[i + 1]) { out.width = Number(argv[++i]) || 180; continue; }
    if (a === '--filter' && argv[i + 1]) { out.filter = String(argv[++i]); continue; }
    if (a === '--help' || a === '-h') {
      console.log(`Usage: backend-pretty-tail.mjs [options]\n\nOptions:\n  --file <path>    Log file (default ../backend/server.log)\n  --lines <n>      Initial lines (default 200)\n  --no-follow      Do not follow (default: follow)\n  --width <n>      Truncate width (default 180)\n  --filter <str>   Only show lines whose URL/event contains <str>\n`);
      process.exit(0);
    }
  }
  return out;
}

const opts = parseArgs(process.argv);

const tailArgs = ['-n', String(opts.lines), opts.follow ? '-F' : opts.file];
if (opts.follow) tailArgs.push(opts.file);
const tail = spawn('tail', tailArgs, { stdio: ['ignore', 'pipe', 'inherit'] });

// Line-by-line stateful parsing
const headerRe = /^\[[^\]]+\]\s+(INFO|WARN|ERROR):\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s+(\S+)\s+\[reqId:\s*([^\]]+)\]\s+completed/;
const statusRe = /"statusCode"\s*:\s*(\d+)/;
const msRe = /responseTime:\s*(\d+)/;
const reqIdRe = /x-request-id\":\s*\"([^\"]+)/;
const eventRe = /\[(WRAPPER DEBUG|SECURITY|SECURITY DEBUG)\].*?event\s*([\w:.-]+)?|Received event\s*([\w:.-]+)/i;
const validationRe = /Validation error.*?\{[\s\S]*?errors:\s*\[(.*?)\]/;

function colorStatus(status) {
  const s = Number(status);
  if (s >= 500) return chalk.bgRed.black(` ${s} `);
  if (s >= 400) return chalk.bgYellow.black(` ${s} `);
  return chalk.bgGreen.black(` ${s} `);
}

function truncate(s, w) {
  return s.length > w ? s.slice(0, w - 1) + '…' : s;
}

const current = { method: null, url: null, reqId: null, status: null, ms: null };

function printLine(line) {
  const time = chalk.gray(new Date().toLocaleTimeString());

  // Header line with method/url/reqId
  const h = headerRe.exec(line);
  if (h) {
    current.method = h[2].toUpperCase();
    current.url = h[3];
    current.reqId = h[4];
    return;
  }

  // Status code line
  const s = statusRe.exec(line);
  if (s) {
    current.status = s[1];
  }

  // Response time -> emit one-liner
  const m = msRe.exec(line);
  if (m && current.method && current.url) {
    current.ms = m[1];
    if (!opts.filter || (current.url?.includes(opts.filter))) {
      const idShort = current.reqId ? ` ${chalk.gray(`#${String(current.reqId).slice(0,8)}`)}` : '';
      const out = `${time} ${chalk.cyan(current.method)} ${chalk.white(current.url)} ${colorStatus(current.status || '0')} ${chalk.magenta(current.ms + 'ms')}${idShort}`;
      console.log(truncate(out, opts.width));
    }
    // reset
    current.method = current.url = current.reqId = current.status = current.ms = null;
    return;
  }

  // Socket event markers
  const ev = eventRe.exec(line);
  if (ev) {
    const evName = ev[2] || ev[3] || 'event';
    if (opts.filter && !evName.includes(opts.filter)) return;
    const tag = chalk.bgBlue.black(' EVT ');
    console.log(truncate(`${time} ${tag} ${chalk.blue(evName)}`, opts.width));
    return;
  }

  // Validation errors condensed
  const ve = validationRe.exec(line);
  if (ve) {
    const tag = chalk.bgRed.black(' ERR ');
    const details = ve[1]?.replace(/\s+/g, ' ').trim();
    console.log(truncate(`${time} ${tag} ${chalk.red('validation')} ${chalk.dim(details)}`, opts.width));
    return;
  }
}

let buffer = '';
tail.stdout.on('data', chunk => {
  buffer += chunk.toString();
  let idx;
  // Process line-by-line
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl);
    buffer = buffer.slice(nl + 1);
    printLine(line);
  }
});

process.on('SIGINT', () => {
  tail.kill('SIGINT');
  process.exit(0);
});


