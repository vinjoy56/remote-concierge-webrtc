// server.js - Con integración de Janus Gateway mejorada
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

const SECRET_KEY = 'tu_secreto_super_seguuuuro_2025!';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const LOGS_FILE = path.join(DATA_DIR, 'activity.log');

// Cargar configuración
const CONFIG_FILE = path.join(__dirname, 'config.json');

if (!fs.existsSync(CONFIG_FILE)) {
  console.error('❌ config.json no encontrado. Crea uno en la raíz del proyecto.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

// Crear carpeta data si no existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Cargar o inicializar devices.json
let devices = {};
if (fs.existsSync(DEVICES_FILE)) {
  try {
    devices = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
  } catch (e) {
    console.log('⚠️ devices.json corrupto, creando nuevo');
  }
}
if (Object.keys(devices).length === 0) {
  const totalCams = config.cameras.total;
  for (let i = 1; i <= totalCams; i++) {
    devices[`cam${i}`] = {
      id: `cam${i}`,
      lock: false,
      fireAlarm: false,
      soundAlarm: false
    };
  }
  saveDevices();
}

// === SIMULACIÓN DE CÁMARAS OFFLINE ===
let cameraStatus = {};

// Inicializar estado de cámaras
function initCameraStatus() {
  const totalCams = config.cameras.total;
  for (let i = 1; i <= totalCams; i++) {
    cameraStatus[`cam${i}`] = { online: true };
  }
}

initCameraStatus();

// Verificar cámaras offline periódicamente
setInterval(() => {
  if (!config.simulation.enabled) return;

  Object.keys(cameraStatus).forEach(camId => {
    // 5% de chance de desconexión
    if (Math.random() < config.simulation.offlineChance && cameraStatus[camId].online) {
      cameraStatus[camId].online = false;
      writeLog(`⚠️ ${camId} está offline`);
    }
  });

  // Volver cámaras a online aleatoriamente
  Object.keys(cameraStatus).forEach(camId => {
    if (!cameraStatus[camId].online && Math.random() < 0.02) { // 2% de chance de volver
      cameraStatus[camId].online = true;
      writeLog(`✅ ${camId} está online nuevamente`);
    }
  });

  // Emitir estado completo cada intervalo
  io.emit('camera-status', cameraStatus);
}, config.simulation.checkInterval);

// === INTEGRACIÓN CON JANUS GATEWAY ===
let janusWs = null;
let janusSessionId = null;
let janusHandles = {};

// Función para conectar a Janus Gateway con reintentos
function connectToJanus() {
  if (janusWs) {
    janusWs.close();
  }

  if (!config.webrtc.janus.enabled) return;

  // ✅ USAR LA IP REAL DE WSL
  const janusUrl = 'ws://172.17.224.84:8188'; // <- Cambio principal
  console.log(`🔄 Intentando conectar a Janus Gateway en ${janusUrl}...`);

  janusWs = new WebSocket(janusUrl);

  janusWs.on('open', () => {
    console.log('✅ Conectado a Janus Gateway');
    // Crear sesión
    const createSessionMsg = {
      janus: "create",
      transaction: `session-${Date.now()}`
    };
    janusWs.send(JSON.stringify(createSessionMsg));
  });

  janusWs.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleJanusMessage(message);
    } catch (e) {
      console.error('Error parsing Janus message:', e);
    }
  });

  janusWs.on('close', (code, reason) => {
    console.log(`❌ Conexión a Janus cerrada:`, reason || `Code ${code}`);
    console.log('🔄 Reintentando conexión en 5 segundos...');
    setTimeout(connectToJanus, 5000);
  });

  janusWs.on('error', (error) => {
    console.error('❌ Error con Janus:', error.message);
    // No cerrar la conexión aquí, dejar que 'close' maneje el reintento
  });
}

function handleJanusMessage(message) {
  if (message.janus === 'success') {
    if (message.transaction.includes('session-')) {
      janusSessionId = message.data.id;
      console.log('✅ Sesión Janus creada:', janusSessionId);
      // Crear handles para cada stream configurado
      config.webrtc.janus.streams.forEach(stream => {
        createJanusHandle(stream.id, stream.janusStreamId);
      });
    } else if (message.transaction.includes('attach-')) {
      const streamId = message.transaction.split('-')[1];
      janusHandles[streamId] = message.data.id;
      console.log('✅ Handle creado para stream:', streamId, 'handle:', message.data.id);
    }
  } else if (message.janus === 'webrtcup') {
    console.log('✅ WebRTC conexión establecida para handle:', message.sender);
  } else if (message.janus === 'media') {
    console.log('✅ Media evento:', message.type, 'para handle:', message.sender);
  } else if (message.janus === 'event') {
    // Eventos de streaming
    console.log('✅ Evento de streaming:', message);
  } else if (message.janus === 'error') {
    console.error('❌ Error de Janus:', message);
  }
}

function createJanusHandle(streamId, janusStreamId) {
  if (!janusWs || !janusSessionId) return;

  const attachMsg = {
    janus: "attach",
    session_id: janusSessionId,
    plugin: "janus.plugin.streaming",
    transaction: `attach-${streamId}`
  };
  janusWs.send(JSON.stringify(attachMsg));
}

function saveDevices() {
  fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2));
}

// Función para escribir y emitir logs (con hora local de Chile)
function writeLog(message) {
  const now = new Date();
  const chileTimeString = now.toLocaleString('sv-SE', {
    timeZone: 'America/Santiago'
  });

  const logLine = `[${chileTimeString}] ${message}`;
  fs.appendFileSync(LOGS_FILE, logLine + '\n');
  console.log(logLine);
  io.emit('new-log', logLine);
}

// Leer últimos N logs (configurable)
function getRecentLogs() {
  if (!fs.existsSync(LOGS_FILE)) return [];
  const content = fs.readFileSync(LOGS_FILE, 'utf8');
  return content.split('\n').filter(line => line.trim() !== '').slice(-config.system.maxLogs);
}

// Middleware de autenticación para Socket.IO
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return next(new Error('Token inválido'));
    socket.user = user;
    next();
  });
}
io.use(authenticateSocket);

// API de login
app.use(express.json());
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!fs.existsSync(USERS_FILE)) {
    return res.status(500).json({ message: 'Archivo de usuarios no encontrado' });
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  const user = users[username];

  if (!user) {
    return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
  }

  bcrypt.compare(password, user.passwordHash, (err, isValid) => {
    if (err || !isValid) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '8h' });
    writeLog(`✅ Conserje inició sesión`);
    res.json({ token });
  });
});

// API para obtener la configuración
app.get('/api/config', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  jwt.verify(token, SECRET_KEY, (err) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    res.json({ sections: config.cameras.sections });
  });
});

// API para obtener streams de Janus
app.get('/api/janus-streams', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  jwt.verify(token, SECRET_KEY, (err) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    res.json({ streams: config.webrtc.janus.streams });
  });
});

// API para obtener configuración WebRTC
app.get('/api/webrtc-config', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  jwt.verify(token, SECRET_KEY, (err) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });
    res.json({
      iceServers: [
        ...config.webrtc.stunServers.map(url => ({ urls: url })),
        ...config.webrtc.turnServers.map(server => ({
          urls: server.url,
          username: server.username,
          credential: server.credential
        }))
      ]
    });
  });
});

// Servir archivos estáticos
app.use(express.static('public'));

// Redirigir raíz al login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Ruta protegida: conserje.html
app.get('/conserje.html', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || 
                new URL(req.url, 'http://localhost').searchParams.get('token');
  
  if (!token) {
    return res.redirect('/login.html');
  }

  jwt.verify(token, SECRET_KEY, (err) => {
    if (err) return res.redirect('/login.html');
    res.sendFile(path.join(__dirname, 'public', 'conserje.html'));
  });
});

// WebSockets
io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} conectado`);
  
  socket.emit('devices-update', devices);
  socket.emit('initial-logs', getRecentLogs());
  socket.emit('camera-status', cameraStatus);

  // Enviar streams de Janus al conectar
  if (config.webrtc.janus.enabled) {
    socket.emit('janus-streams', config.webrtc.janus.streams);
  }

  socket.on('toggle-lock', ({ camId, state }) => {
    // Verificar si cámara está online
    if (!cameraStatus[camId]?.online) {
      socket.emit('error', { message: `⚠️ ${camId} está offline. No se puede controlar.` });
      return;
    }

    if (devices[camId] !== undefined) {
      devices[camId].lock = state;
      saveDevices();
      io.emit('devices-update', devices);
      writeLog(`🔑 Conserje ${state ? 'cerró' : 'abrió'} la cerradura de ${camId}`);
    }
  });

  socket.on('trigger-alarm', ({ camId, type }) => {
    // Verificar si cámara está online
    if (!cameraStatus[camId]?.online) {
      socket.emit('error', { message: `⚠️ ${camId} está offline. No se puede activar alarma.` });
      return;
    }

    if (devices[camId] && ['fire', 'sound'].includes(type)) {
      devices[camId][type + 'Alarm'] = true;
      saveDevices();
      io.emit('alarm-triggered', { camId, type });
      writeLog(`🚨 Conserje activó alarma ${type === 'fire' ? 'de incendio' : 'sonora'} en ${camId}`);
      
      setTimeout(() => {
        if (devices[camId]) {
          devices[camId][type + 'Alarm'] = false;
          saveDevices();
          io.emit('devices-update', devices);
        }
      }, 10000);
    }
  });

  // WebRTC - Señalización
  socket.on('webrtc-offer', (data) => {
    socket.broadcast.emit('webrtc-offer', data);
  });

  socket.on('webrtc-answer', (data) => {
    socket.broadcast.emit('webrtc-answer', data);
  });

  socket.on('webrtc-ice-candidate', (data) => {
    socket.broadcast.emit('webrtc-ice-candidate', data);
  });

  // Canal bidireccional con condominio
  socket.on('send-to-condominium', (data) => {
    socket.broadcast.emit('message-from-concierge', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 ${socket.user.username} desconectado`);
  });
});

// Crear users.json si no existe
if (!fs.existsSync(USERS_FILE)) {
  const saltRounds = 10;
  bcrypt.hash('password123', saltRounds, (err, hash) => {
    if (err) throw err;
    const defaultUser = {
      conserje: {
        username: 'conserje',
        passwordHash: hash
      }
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUser, null, 2));
    console.log('✅ users.json creado con usuario: conserje / password123');
  });
}

// Iniciar conexión a Janus al iniciar el servidor
connectToJanus();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor con autenticación en http://localhost:${PORT}`);
  console.log(`   Usuario: conserje`);
  console.log(`   Contraseña: password123`);
  console.log(`   Cámaras: ${config.cameras.total}`);
  console.log(`   Simulación: ${config.simulation.enabled ? 'activada' : 'desactivada'}`);
  console.log(`   Janus: ${config.webrtc.janus.enabled ? 'conectado' : 'desconectado'}`);
});