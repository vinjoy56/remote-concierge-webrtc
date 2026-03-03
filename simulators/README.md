# Modbus TCP Simulator - InteliLite NT AMF 26 P

## Descripción

Simulador Modbus TCP que emula el controlador **InteliLite NT AMF 26 P** de ComAp, incluyendo TODOS los sensores del edificio.

## Uso

### 1. Iniciar el Simulador

```bash
node simulators/modbus-simulator.js
```

El simulador se ejecutará en `localhost:5502` (puerto no estándar para evitar conflictos con dispositivos reales).

### 2. Sistema Simulado

El simulador genera datos realistas y cambiantes para:

- ⚙️ **Generador y Red Eléctrica**
  - Voltajes L1/L2/L3 (mains y generador)
  - Frecuencia
  - Temperatura del motor
  - Presión de aceite
  - Nivel de combustible
  - Voltaje de batería
  - Horas de funcionamiento

- 💧 **Sistema Hidráulico**
  - Niveles de tanques A y B (%)
  - Presión de bombas Torre A/B (bar)
  - Estado de bombas B1/B2
  - Flujo de agua (L/min)
  - Consumo diario

- 🏊 **Piscina**
  - Temperatura del agua (°C)
  - Nivel de pH
  - Cloro (ppm)
  - Estado de bomba

- 🌡️ **Clima**
  - Temperatura exterior
  - Temperatura interior (Hall)
  - Índice de calidad de aire (ICA)

- 🔌 **Consumo Eléctrico**
  - Potencia comunidad (kW)
  - Potencia Torre A (kW)
  - Potencia Torre B (kW)

- ⚡ **Cerco Eléctrico**
  - Voltaje (V)
  - Estado (Normal/Alarma)

- 🔧 **Variador AC (VFD)**
  - Frecuencia (Hz)
  - Corriente (A)
  - Estado (Detenido/Funcionando/Falla)

- 🚨 **Detectores de Humo** (6 zonas)
  - Hall, Cocina, Pasillo 1, Pasillo 2, Sala Eléctrica, Bodega

### 3. Características de Simulación

- **Valores realistas**: Fluctuaciones aleatorias dentro de rangos normales
- **Transferencia automática**: Simula falla de red eléctrica cada 5 minutos (mains ↔ generador)
- **Alarmas aleatorias**: Genera alarmas ocasionales para testing
- **Actualización continua**: Valores se actualizan cada segundo

### 4. Conectar Aplicación Web

En `config.json`, asegúrate de que la configuración apunte al simulador:

```json
{
  "generator": {
    "enabled": true,
    "modbusHost": "127.0.0.1",
    "modbusPort": 5502,
    "pollInterval": 2000
  }
}
```

Luego inicia el servidor:

```bash
node server.js
```

### 5. Monitoreo en Tiempo Real

1. Abre `http://localhost:3000`
2. Inicia sesión  
3. Ve a **"Sensores"** en el sidebar
4. Los datos se actualizarán automáticamente vía Socket.IO

### 6. Mapa de Registros

| Sistema | Rango de Direcciones |
|---------|---------------------|
| Generador y Mains | 1000-1410 |
| Sistema Hidráulico | 2100-2140 |
| Piscina | 2200-2230 |
| Clima | 2300-2310 |
| Eléctrico | 2400-2420 |
| Cerco Eléctrico | 2500-2501 |
| VFD | 2600-2620 |
| Detectores de Humo | 3000-3005 |
| Alarmas | 3100 |

Ver `config/modbus-registers.json` para el mapa detallado.

### 7. Modo Productivo

Para conectar al dispositivo físico InteliLite NT AMF 26 P:

1. Actualiza `config.json`:
   ```json
   {
     "generator": {
       "modbusHost": "192.168.0.150",  // IP del InteliLite
       "modbusPort": 502,                // Puerto estándar
     }
   }
   ```

2. **NO ejecutar** el simulador
3. Iniciar solo el servidor: `node server.js`

## Troubleshooting

### Puerto en uso
Si el puerto 5502 está ocupado, modifica `PORT` en `modbus-simulator.js`.

### Datos no actualizan
- Verifica que el simulador esté corriendo
- Revisa la consola del servidor para mensajes de conexión Modbus
- Confirma que `generator.enabled = true` en `config.json`

### Errores de registro
Revisa que las direcciones en `modbus-registers.json` coincidan con las del código.
