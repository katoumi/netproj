// server.js - NetProj backend (Express + Socket.IO)
// WARNING: runs system ping/traceroute. Use locally and carefully.
const express = require('express');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// rate limiter to avoid abuse
const limiter = rateLimit({
  windowMs: 15 * 1000, // 15 sec
  max: 30,
  message: 'Too many requests - slow down'
});
app.use('/api/', limiter);

app.get('/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// simple hostname/IP validator (restricts special characters)
const TARGET_RE = /^[A-Za-z0-9_.:-]{1,255}$/;

function spawnCommand(cmd, args, onLine, onDone){
  try{
    const proc = spawn(cmd, args);
    proc.stdout.on('data', (chunk) => {
      const s = chunk.toString();
      s.split(/\r?\n/).forEach(line => { if(line) onLine(line); });
    });
    proc.stderr.on('data', (chunk) => {
      const s = chunk.toString();
      s.split(/\r?\n/).forEach(line => { if(line) onLine(line); });
    });
    proc.on('close', (code) => onDone(code));
    proc.on('error', (err) => onDone(err));
    return proc;
  }catch(err){
    onDone(err);
  }
}

io.on('connection', socket => {
  socket.emit('server', { msg: 'welcome' });

  socket.on('start', ({ opId, command, payload }) => {
    if(!opId || !command) return;
    const { target } = payload || {};
    if(!target || !TARGET_RE.test(target)){
      socket.emit('stream', { opId, line: 'Invalid target', rtt: null });
      socket.emit('done', { opId });
      return;
    }

    if(command === 'ping'){
      const count = parseInt(payload.count) || 4;
      const args = process.platform === 'win32' ? ['-n', String(count), target] : ['-c', String(count), target];
      const cmd = 'ping';
      spawnCommand(cmd, args,
        (line) => {
          let rtt = null;
          const m = line.match(/time[=<]\s*([0-9.]+)\s*ms/i);
          if(m) rtt = parseFloat(m[1]);
          socket.emit('stream', { opId, line, rtt });
        },
        (exit) => socket.emit('done', { opId, exit })
      );
    } else if(command === 'traceroute'){
      let cmd, args;
      if(process.platform === 'win32'){ cmd = 'tracert'; args = ['-d', target]; }
      else { cmd = 'traceroute'; args = ['-n', '-m', String(payload.maxHops || 30), target]; }
      spawnCommand(cmd, args,
        (line) => socket.emit('stream', { opId, line }),
        (exit) => socket.emit('done', { opId, exit })
      );
    } else {
      socket.emit('stream', { opId, line: 'Unknown command', rtt: null });
      socket.emit('done', { opId });
    }
  });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('NetProj server listening on http://localhost:' + PORT));
