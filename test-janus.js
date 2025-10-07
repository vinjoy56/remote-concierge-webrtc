const WebSocket = require('ws');

const ws = new WebSocket('ws://172.17.224.84:8188/');

ws.on('open', () => {
  console.log('✅ Conectado a Janus!');
});

ws.on('error', (err) => {
  console.log('❌ Error:', err.message);
});
