const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sabhi files serve karo (pehle sirf index.html jata tha, isliye shanu.js load nahi hota tha
// aur Groups / Private chat chalte hi nahi the)
const FILES = ['index.html', 'shanu.js', 'ui.js', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png'];
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
FILES.forEach(f => app.get('/' + f, (req, res) => res.sendFile(path.join(__dirname, f), err => { if (err && !res.headersSent) res.status(404).end(); })));

const users = new Map();   // socket.id -> naam
const history = [];        // last 100 messages (server band hone par ud jate hain)

function onlineList() { return [...users.values()]; }

function system(text) {
  const msg = { system: true, text, time: Date.now() };
  history.push(msg);
  if (history.length > 100) history.shift();
  io.emit('message', msg);
}

io.on('connection', (socket) => {
  socket.on('join', (rawName) => {
    const name = String(rawName || '').trim().slice(0, 20) || 'Dost';
    users.set(socket.id, name);
    socket.emit('history', history);
    io.emit('users', onlineList());
    system(name + ' aa gaya');
  });

  socket.on('message', (rawText) => {
    const name = users.get(socket.id);
    if (!name) return;
    const text = String(rawText || '').trim().slice(0, 500);
    if (!text) return;
    const msg = { name, text, time: Date.now() };
    history.push(msg);
    if (history.length > 100) history.shift();
    io.emit('message', msg);
  });

  socket.on('typing', () => {
    const name = users.get(socket.id);
    if (name) socket.broadcast.emit('typing', name);
  });

  socket.on('disconnect', () => {
    const name = users.get(socket.id);
    if (!name) return;
    users.delete(socket.id);
    io.emit('users', onlineList());
    system(name + ' chala gaya');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Chat chal raha hai!');
  console.log('Apne computer par:  http://localhost:' + PORT);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list) {
      if (i.family === 'IPv4' && !i.internal) {
        console.log('Dosto ke liye (same WiFi):  http://' + i.address + ':' + PORT);
      }
    }
  }
});
