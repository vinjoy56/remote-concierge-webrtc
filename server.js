// server.js - Con integración de Janus Gateway mejorada + WebRTC real
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// === WEATHER SERVICE ===
const WEATHER_API_KEY = "84106259850d4e70b8a194918261201";
const WEATHER_URL = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=La Serena&lang=es`;

let lastWeatherData = null;

function fetchWeather() {
  http.get(WEATHER_URL, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const weather = JSON.parse(data);
        if (weather.current) {
          lastWeatherData = {
            temp_c: weather.current.temp_c,
            condition: {
              text: weather.current.condition.text,
              code: weather.current.condition.code
            }
          };
          io.emit('weather-update', lastWeatherData);
          // console.log(`☁️ Clima: ${weather.current.temp_c}°C`);
        }
      } catch (e) {
        console.error("Weather parse error:", e);
      }
    });
  }).on('error', (e) => console.error("Weather fetch error:", e));
}
// Initial fetch
setTimeout(fetchWeather, 5000);
setInterval(fetchWeather, 15 * 60 * 1000);
// =======================

// ==============================================

// Session configuration
app.use(session({
  secret: 'edificio-inteligente-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax', // Changed from 'strict' to allow cookies on navigation
    maxAge: 4 * 60 * 60 * 1000 // 4 hours
  }
}));

const SECRET_KEY = 'tu_secreto_super_seguuuuro_2025!';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RESIDENTS_FILE = path.join(DATA_DIR, 'residents.json');
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

// Ensure all cameras exist in devices (Scale Up logic)
const totalCams = config.cameras.total;
let devicesUpdated = false;
for (let i = 1; i <= totalCams; i++) {
  const camId = `cam${i}`;
  if (!devices[camId]) {
    devices[camId] = {
      id: camId,
      lock: false,
      fireAlarm: false,
      soundAlarm: false
    };
    devicesUpdated = true;
  }
}

if (devicesUpdated) {
  saveDevices();
  console.log(`✅ Devices updated to match total cameras: ${totalCams}`);
}


// === SENSOR MANAGER ===
const SensorManager = require('./services/SensorManager');
const HikvisionService = require('./services/HikvisionService');
const AIService = require('./services/AIService');

// Initialize Services
const sensorManager = new SensorManager(config);
const hikvisionService = new HikvisionService(config);
const aiService = new AIService(config);

sensorManager.init();
sensorManager.startSimulation();
hikvisionService.startPolling();

// Handle Sensor Updates
sensorManager.on('update', (state) => {
  io.emit('sensors-update', state);
});

// Handle Hikvision Events -> Pass to AI for filtering

hikvisionService.on('event', (log) => {
  // Instead of logging directly, we ask AI to analyze certain events
  if (log.type === 'access_control') {
    aiService.analyzeEvent({ source: 'Hikvision Access', details: log });
    writeLog(log.message);
  } else if (log.type === 'motion') {
    // Emit dedicated motion event for UI effects
    io.emit('motion-alert', log);
    // Log motion events for debugging
    writeLog(log.message);
  } else {
    writeLog(log.message);
  }
});

// Handle AI Alert Confirmation (Tier 2 Result)
aiService.on('alert', (alert) => {
  writeLog(`🚨 ${alert.message}`);
  // Could also emit a specific 'users-alert' socket event here to pop up a modal
  io.emit('ai-alert', alert);
});

// Expose sensorsState API for control handlers below
// We'll wrap the manager calls in the socket handlers
// NOTE: sensorsState global variable is removed, we access via manager.state

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

  // Legacy Token Auth
  if (token) {
    try {
      const user = jwt.verify(token, SECRET_KEY);
      socket.user = user;
      return next();
    } catch (err) {
      console.warn('Socket token invalid, falling back to session/guest');
    }
  }

  // Fallback: Assign guest/session user for now (Session Auth TODO)
  // This allows the connection to proceed without "No token" error
  socket.user = {
    username: 'WebClient',
    role: 'user'
  };
  next();
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




// TEST ENDPOINT: Manually trigger motion detection alert
app.get('/api/test-motion/:camId', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  jwt.verify(token, SECRET_KEY, (err) => {
    if (err) return res.status(401).json({ error: 'Token inválido' });

    const camId = req.params.camId;
    const camMetadata = config.cameras.metadata[camId];

    if (!camMetadata) {
      return res.status(404).json({ error: `Camera ${camId} not found` });
    }

    const testEvent = {
      type: 'motion',
      camId: camId,
      channel: camMetadata.logicalId.toString(),
      cameraName: camMetadata.name,
      message: `🧪 TEST: Movimiento detectado en ${camMetadata.name}`,
      timestamp: new Date()
    };

    io.emit('motion-alert', testEvent);
    writeLog(testEvent.message);

    res.json({
      success: true,
      message: 'Motion alert triggered',
      event: testEvent
    });
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
  socket.emit('sensors-update', sensorManager.state);
  socket.emit('initial-logs', getRecentLogs());
  socket.emit('camera-status', cameraStatus);

  // Send cached weather if available
  if (lastWeatherData) {
    socket.emit('weather-update', lastWeatherData);
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

  // Sensor Control Events
  socket.on('set-fence-status', ({ status }) => {
    const msg = sensorManager.setFenceStatus(status);
    writeLog(msg);
    // No need to emit update manually, manager does it
  });

  socket.on('set-ac-drive', ({ status }) => {
    const msg = sensorManager.setAcDriveStatus(status);
    writeLog(msg);
  });

  // WebRTC - Señalización
  socket.on('webrtc-offer', (data) => socket.broadcast.emit('webrtc-offer', data));
  socket.on('webrtc-answer', (data) => socket.broadcast.emit('webrtc-answer', data));
  socket.on('webrtc-ice-candidate', (data) => socket.broadcast.emit('webrtc-ice-candidate', data));

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


// Weather API handled at top of file

// ============================================
// AUTHENTICATION & AUTHORIZATION SYSTEM
// ============================================

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load users from file
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    console.error('❌ users.json not found. Run generate_users.js first.');
    return [];
  }
  const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  return data.users || [];
}

// Authentication Middleware
function requireAuth(req, res, next) {
  console.log(`🔒 requireAuth check for ${req.path}`);
  console.log(`   Session ID: ${req.sessionID}`);
  console.log(`   User ID: ${req.session?.userId}`);

  if (req.session && req.session.userId) {
    console.log(`✅ Auth passed for ${req.path}`);
    return next();
  }
  console.log(`❌ Auth failed for ${req.path} - no session`);
  res.redirect('/login.html');
}

// Authorization Middleware (role-based)
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.session.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// LOGIN endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Compare password with hash
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session
  req.session.userId = user.username;
  req.session.userRole = user.role;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.userUnit = user.unit || 'N/A';

  console.log('✅ Login successful for:', user.username);
  console.log('   Session ID:', req.sessionID);
  console.log('   Session data:', req.session);

  res.json({
    success: true,
    user: {
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      unit: user.unit
    }
  });
});

// LOGOUT endpoint
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// === MODBUS SERVICE (Generator/Sensor Controller) ===
const ModbusService = require('./services/ModbusService');

let modbusService = null;

if (config.generator && config.generator.enabled) {
  modbusService = new ModbusService({
    host: config.generator.modbusHost,
    port: config.generator.modbusPort,
    pollInterval: config.generator.pollInterval,
    reconnectTimeout: config.generator.reconnectTimeout
  });

  // Event listeners
  modbusService.on('connected', () => {
    console.log('🔌 [Sensors] Modbus TCP connected');
    io.emit('generator-connected');
  });

  modbusService.on('disconnected', () => {
    console.log('❌ [Sensors] Modbus TCP disconnected');
    io.emit('generator-disconnected');
  });

  modbusService.on('data-update', (data) => {
    // Broadcast all sensor data to clients
    io.emit('generator-update', data);
  });

  modbusService.on('alarm', (alarmData) => {
    console.warn('⚠️ [Sensors] Alarm:', alarmData.alarms.map(a => a.name).join(', '));
    io.emit('generator-alarm', alarmData);

    //Log alarms if enabled
    if (config.generator.alarmsToLog) {
      alarmData.alarms.forEach(alarm => {
        logs.push(`[${new Date().toLocaleTimeString()}] 🚨 Alarm: ${alarm.name}`);
      });
    }
  });

  modbusService.on('error', (error) => {
    console.error('❌ [Sensors] Modbus error:', error.message);
  });

  // Connect
  modbusService.connect();
}

// API endpoint for generator status
app.get('/api/generator/status', requireAuth, (req, res) => {
  if (!modbusService) {
    return res.json({ enabled: false, message: 'Modbus service not enabled' });
  }
  res.json(modbusService.getCurrentStatus());
});

// CHECK SESSION endpoint
app.get('/api/auth/session', (req, res) => {
  console.log('🔍 Session check requested');
  console.log('   Session ID:', req.sessionID);
  console.log('   Session exists:', !!req.session);
  console.log('   User ID in session:', req.session?.userId);

  if (req.session && req.session.userId) {
    console.log('✅ Session valid for:', req.session.userId);
    res.json({
      authenticated: true,
      user: {
        username: req.session.userId,
        name: req.session.userName,
        role: req.session.userRole,
        email: req.session.userEmail,
        unit: req.session.userUnit
      }
    });
  } else {
    console.log('❌ No valid session found');
    res.json({ authenticated: false });
  }
});

// GET USER PERMISSIONS endpoint
app.get('/api/user/permissions', requireAuth, (req, res) => {
  const role = req.session.userRole;

  const permissions = {
    user: {
      cameras: true,
      sensors: false,
      accessControl: false,
      solar: false,
      map: false,
      stats: false,
      logs: false,
      profile: true
    },
    committee: {
      cameras: true,
      sensors: true,
      accessControl: true,
      solar: true,
      map: true,
      stats: true,
      logs: true,
      profile: true
    },
    admin: {
      cameras: true,
      sensors: true,
      accessControl: true,
      solar: true,
      map: true,
      stats: true,
      logs: true,
      profile: true,
      admin: true
    }
  };

  res.json({
    role: role,
    permissions: permissions[role] || permissions.user
  });
});

// Serve static files (login page public, others protected)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Protect main app page
app.get('/conserje.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'conserje.html'));
});

// Protect 3D testing page
app.get('/pruebas-3d.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pruebas-3d.html'));
});

// Redirect root to appropriate page
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/conserje.html');
  } else {
    res.redirect('/login.html');
  }
});

// Login page (public)
app.get('/login.html', (req, res) => {
  // If already logged in, redirect to app
  if (req.session && req.session.userId) {
    return res.redirect('/conserje.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API Endpoints for Data
app.get('/api/residents', requireAuth, (req, res) => {
  if (fs.existsSync(RESIDENTS_FILE)) {
    const residents = JSON.parse(fs.readFileSync(RESIDENTS_FILE, 'utf8'));
    res.json(residents);
  } else {
    res.json([]);
  }
});

app.get('/api/devices', requireAuth, (req, res) => {
  res.json(devices);
});

app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    cameras: config.cameras,
    simulation: config.simulation,
    webrtc: config.webrtc
  });
});

// API: Generator status
app.get('/api/generator/status', requireAuth, (req, res) => {
  if (!modbusService) {
    return res.status(503).json({ error: 'Generator monitoring not enabled' });
  }
  res.json(modbusService.getCurrentStatus());
});

// Test endpoint to trigger motion alerts for 3D testing
app.get('/api/test-motion/:camId', requireAuth, (req, res) => {
  const camId = req.params.camId;

  // Load camera names from config
  const config = require('./config.json');
  const cameraName = config.cameras.metadata[camId]?.name || camId.toUpperCase();

  const motionAlert = {
    type: 'motion',
    camId: camId,
    cameraName: cameraName,
    message: `🔔 Movimiento detectado en ${cameraName}`,
    timestamp: new Date()
  };

  // Broadcast to all connected clients
  io.emit('motion-alert', motionAlert);

  console.log(`📡 Test motion alert sent for ${camId}`);

  res.json({
    success: true,
    message: `Motion alert triggered for ${cameraName}`,
    alert: motionAlert
  });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor con autenticación en http://localhost:${PORT}`);
  console.log(`   Usuario: conserje`);
  console.log(`   Contraseña: password123`);
  console.log(`   Cámaras: ${config.cameras.total}`);
  console.log(`   Simulación: ${config.simulation.enabled ? 'activada' : 'desactivada'}`);
  console.log(`   Janus: ${config.webrtc.janus.enabled ? 'conectado' : 'desconectado'}`);
});