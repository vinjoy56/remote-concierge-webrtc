/**
 * Modbus TCP Simulator for InteliLite NT AMF 26 P
 * 
 * Simulates ALL building sensors for development without physical hardware.
 * Manages: Generator, Hydraulic, Pool, Climate, Electric, Fence, VFD, Smoke Detectors
 */

const ModbusRTU = require('modbus-serial');

const PORT = 5502;

// Initialize holding registers array (10,000 registers)
const holdingRegisters = Buffer.alloc(20000); // 10,000 registers * 2 bytes each

// Create server vectors
const vector = {
    getHoldingRegister: function (addr) {
        return holdingRegisters.readUInt16BE(addr * 2);
    },
    setHoldingRegister: function (addr, value) {
        holdingRegisters.writeUInt16BE(value, addr * 2);
    }
};

// Create Modbus TCP server
const serverTCP = new ModbusRTU.ServerTCP(vector, {
    host: '0.0.0.0',
    port: PORT,
    debug: false,
    unitID: 1
});

// Comprehensive simulated state
let state = {
    // Generator & Mains
    generatorRunning: false,
    onMains: true,
    lastTransfer: Date.now(),
    engineTemp: 20,
    oilPressure: 0,
    fuelLevel: 82,
    batteryVoltage: 27.4,
    mainsVoltageL1: 220,
    mainsVoltageL2: 220,
    mainsVoltageL3: 220,
    mainsFrequency: 50.0,
    genVoltageL1: 0,
    genVoltageL2: 0,
    genVoltageL3: 0,
    genFrequency: 0,
    engineHours: 1234,
    generatorStarts: 89,

    // Hydraulic System
    waterTankA: 85,
    waterTankB: 92,
    pumpTorreAPressure: 4.2,
    pumpTorreBPressure: 4.1,
    pumpB1State: 1, // ON
    pumpB2State: 2, // STANDBY
    waterFlowRate: 12.5,
    waterConsumedToday: 4200,

    // Pool
    poolTemp: 24.5,
    poolPH: 7.2,
    poolChlorine: 1.5,
    poolPumpState: 1,

    // Climate
    tempExterior: 22,
    tempInteriorHall: 20,
    airQualityIndex: 45,

    // Electric Consumption
    powerComunidad: 38.4,
    powerTorreA: 125.2,
    powerTorreB: 118.8,

    // Electric Fence
    fenceVoltage: 10500,
    fenceStatus: 1, // Normal

    // AC Drive (VFD)
    vfdFrequency: 50.0,
    vfdCurrent: 12.3,
    vfdStatus: 1, // Running

    // Smoke Detectors (6 zones)
    smokeZones: [0, 0, 0, 0, 0, 0], // All normal

    // Alarms
    activeAlarms: 0
};

/**
 * Update ALL simulated values with realistic variations
 */
function updateSimulatedValues() {
    // === GENERATOR & MAINS ===
    if (state.onMains) {
        state.mainsVoltageL1 = 220 + (Math.random() - 0.5) * 10;
        state.mainsVoltageL2 = 220 + (Math.random() - 0.5) * 10;
        state.mainsVoltageL3 = 220 + (Math.random() - 0.5) * 10;
        state.mainsFrequency = 50.0 + (Math.random() - 0.5) * 0.2;
    } else {
        state.mainsVoltageL1 = 0;
        state.mainsVoltageL2 = 0;
        state.mainsVoltageL3 = 0;
        state.mainsFrequency = 0;
    }

    if (state.generatorRunning) {
        state.genVoltageL1 = 220 + (Math.random() - 0.5) * 5;
        state.genVoltageL2 = 220 + (Math.random() - 0.5) * 5;
        state.genVoltageL3 = 220 + (Math.random() - 0.5) * 5;
        state.genFrequency = 50.0 + (Math.random() - 0.5) * 0.1;
        state.engineTemp = 75 + (Math.random() - 0.5) * 10;
        state.oilPressure = 4.5 + (Math.random() - 0.5) * 0.5;
        state.fuelLevel = Math.max(0, state.fuelLevel - 0.01); // Consume fuel slowly
    } else {
        state.genVoltageL1 = 0;
        state.genVoltageL2 = 0;
        state.genVoltageL3 = 0;
        state.genFrequency = 0;
        state.engineTemp = Math.max(20, state.engineTemp - 0.5);
        state.oilPressure = 0;
    }

    state.batteryVoltage = 27.4 + (Math.random() - 0.5) * 0.3;

    // Auto-switch mains/gen every 60 minutes for testing (was 5 mins)
    const timeSinceTransfer = Date.now() - state.lastTransfer;
    if (timeSinceTransfer > 60 * 60 * 1000) {
        state.lastTransfer = Date.now();
        if (state.onMains) {
            console.log('🔴 [SIM] Mains failure - switching to generator');
            state.onMains = false;
            state.generatorRunning = true;
            state.activeAlarms |= (1 << 0);
        } else {
            console.log('🟢 [SIM] Mains restored');
            state.onMains = true;
            setTimeout(() => {
                state.generatorRunning = false;
                state.activeAlarms &= ~(1 << 0);
            }, 10000);
        }
    }

    // === HYDRAULIC ===
    state.waterTankA += (Math.random() - 0.5) * 0.5;
    state.waterTankA = Math.max(50, Math.min(100, state.waterTankA));
    state.waterTankB += (Math.random() - 0.5) * 0.5;
    state.waterTankB = Math.max(50, Math.min(100, state.waterTankB));
    state.pumpTorreAPressure = 4.2 + (Math.random() - 0.5) * 0.3;
    state.pumpTorreBPressure = 4.1 + (Math.random() - 0.5) * 0.3;
    state.waterFlowRate = 12.5 + (Math.random() - 0.5) * 2;
    state.waterConsumedToday += Math.random() * 5; // Increment slowly

    // === POOL ===
    state.poolTemp = 24.5 + (Math.random() - 0.5) * 0.5;
    state.poolPH = 7.2 + (Math.random() - 0.5) * 0.2;
    state.poolChlorine = 1.5 + (Math.random() - 0.5) * 0.1;

    // === CLIMATE ===
    state.tempExterior = 22 + (Math.random() - 0.5) * 3;
    state.tempInteriorHall = 20 + (Math.random() - 0.5) * 1;
    state.airQualityIndex = 45 + Math.floor((Math.random() - 0.5) * 10);

    // === ELECTRIC ===
    state.powerComunidad = 38.4 + (Math.random() - 0.5) * 5;
    state.powerTorreA = 125.2 + (Math.random() - 0.5) * 10;
    state.powerTorreB = 118.8 + (Math.random() - 0.5) * 10;

    // === FENCE ===
    state.fenceVoltage = 10500 + Math.floor((Math.random() - 0.5) * 1000);

    // === VFD ===
    state.vfdFrequency = 50.0 + (Math.random() - 0.5) * 0.5;
    state.vfdCurrent = 12.3 + (Math.random() - 0.5) * 1;

    // Rare random alarms
    if (Math.random() < 0.0005) {
        const alarmBit = Math.floor(Math.random() * 12);
        state.activeAlarms |= (1 << alarmBit);
        console.log(`⚠️ [SIM] Alarm triggered: bit ${alarmBit}`);
    } else if (state.activeAlarms > 0 && Math.random() < 0.01) {
        state.activeAlarms = 0;
    }

    writeRegisters();
}

/**
 * Write ALL state to holding registers
 */
function writeRegisters() {
    // Generator & Mains
    vector.setHoldingRegister(1000, state.generatorRunning ? 2 : 0);
    vector.setHoldingRegister(1001, state.onMains ? 1 : 0);
    vector.setHoldingRegister(1100, Math.round(state.mainsVoltageL1 * 10));
    vector.setHoldingRegister(1101, Math.round(state.mainsVoltageL2 * 10));
    vector.setHoldingRegister(1102, Math.round(state.mainsVoltageL3 * 10));
    vector.setHoldingRegister(1110, Math.round(state.mainsFrequency * 100));
    vector.setHoldingRegister(1200, Math.round(state.genVoltageL1 * 10));
    vector.setHoldingRegister(1201, Math.round(state.genVoltageL2 * 10));
    vector.setHoldingRegister(1202, Math.round(state.genVoltageL3 * 10));
    vector.setHoldingRegister(1210, Math.round(state.genFrequency * 100));
    vector.setHoldingRegister(1300, Math.round(state.engineTemp));
    vector.setHoldingRegister(1310, Math.round(state.oilPressure * 10));
    vector.setHoldingRegister(1320, Math.round(state.fuelLevel));
    vector.setHoldingRegister(1330, Math.round(state.batteryVoltage * 10));
    vector.setHoldingRegister(1400, state.engineHours & 0xFFFF);
    vector.setHoldingRegister(1401, (state.engineHours >> 16) & 0xFFFF);
    vector.setHoldingRegister(1410, state.generatorStarts);

    // Hydraulic
    vector.setHoldingRegister(2100, Math.round(state.waterTankA));
    vector.setHoldingRegister(2101, Math.round(state.waterTankB));
    vector.setHoldingRegister(2110, Math.round(state.pumpTorreAPressure * 10));
    vector.setHoldingRegister(2111, Math.round(state.pumpTorreBPressure * 10));
    vector.setHoldingRegister(2120, state.pumpB1State);
    vector.setHoldingRegister(2121, state.pumpB2State);
    vector.setHoldingRegister(2130, Math.round(state.waterFlowRate * 10));
    vector.setHoldingRegister(2140, Math.round(state.waterConsumedToday));

    // Pool
    vector.setHoldingRegister(2200, Math.round(state.poolTemp * 10));
    vector.setHoldingRegister(2210, Math.round(state.poolPH * 10));
    vector.setHoldingRegister(2220, Math.round(state.poolChlorine * 10));
    vector.setHoldingRegister(2230, state.poolPumpState);

    // Climate
    vector.setHoldingRegister(2300, Math.round(state.tempExterior));
    vector.setHoldingRegister(2301, Math.round(state.tempInteriorHall));
    vector.setHoldingRegister(2310, state.airQualityIndex);

    // Electric
    vector.setHoldingRegister(2400, Math.round(state.powerComunidad * 10));
    vector.setHoldingRegister(2410, Math.round(state.powerTorreA * 10));
    vector.setHoldingRegister(2420, Math.round(state.powerTorreB * 10));

    // Fence
    vector.setHoldingRegister(2500, state.fenceVoltage);
    vector.setHoldingRegister(2501, state.fenceStatus);

    // VFD
    vector.setHoldingRegister(2600, Math.round(state.vfdFrequency * 100));
    vector.setHoldingRegister(2610, Math.round(state.vfdCurrent * 10));
    vector.setHoldingRegister(2620, state.vfdStatus);

    // Smoke Detectors
    for (let i = 0; i < 6; i++) {
        vector.setHoldingRegister(3000 + i, state.smokeZones[i]);
    }

    // Alarms
    vector.setHoldingRegister(3100, state.activeAlarms & 0xFFFF);
}

// Initial values
writeRegisters();

// Start updating values
setInterval(updateSimulatedValues, 1000);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  InteliLite NT AMF 26 P - MODBUS TCP SIMULATOR (ALL SENSORS) ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`✅ Server listening on port ${PORT}`);
console.log('');
console.log('📋 Simulated Systems:');
console.log('   ⚙️  Generator & Mains (1000-1410)');
console.log('   💧 Hydraulic System (2100-2140)');
console.log('   🏊 Pool Monitoring (2200-2230)');
console.log('   🌡️  Climate Sensors (2300-2310)');
console.log('   🔌 Electric Consumption (2400-2420)');
console.log('   ⚡ Electric Fence (2500-2501)');
console.log('   🔧 AC Drive/VFD (2600-2620)');
console.log('   🚨 Smoke Detectors 6 zones (3000-3005)');
console.log('   ⚠️  Alarms Bitmap (3100)');
console.log('');
console.log('🔄 Auto-switching Mains ↔ Generator every 5 minutes');
console.log('');
console.log('💡 Connect ModbusService to: 127.0.0.1:5502');
console.log('');
