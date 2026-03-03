/**
 * ModbusService - Handles Modbus TCP communication with InteliLite NT AMF 26 P
 * 
 * Provides real-time monitoring of generator controller via Modbus TCP protocol.
 * Automatically reconnects on connection loss and emits parsed data via EventEmitter.
 */

const ModbusRTU = require('modbus-serial');
const EventEmitter = require('events');
const registerMap = require('../config/modbus-registers.json');

class ModbusService extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            host: config.host || '127.0.0.1',
            port: config.port || 5502,
            pollInterval: config.pollInterval || 2000,
            reconnectTimeout: config.reconnectTimeout || 5000,
            unitId: config.unitId || 1
        };

        this.client = new ModbusRTU();
        this.connected = false;
        this.pollTimer = null;
        this.reconnectTimer = null;
        this.currentData = {};
        this.lastAlarmBitmap = 0; // Track last alarm state to prevent spam

        console.log(`[ModbusService] Configured for ${this.config.host}:${this.config.port}`);
    }

    /**
     * Connect to Modbus TCP server
     */
    async connect() {
        try {
            await this.client.connectTCP(this.config.host, { port: this.config.port });
            this.client.setID(this.config.unitId);
            this.client.setTimeout(3000); // 3 second timeout

            this.connected = true;
            console.log(`✅ [ModbusService] Connected to ${this.config.host}:${this.config.port}`);
            this.emit('connected');

            // Start polling
            this.startPolling();

            return true;
        } catch (error) {
            console.error(`❌ [ModbusService] Connection failed:`, error.message);
            this.connected = false;
            this.emit('error', error);
            this.scheduleReconnect();
            return false;
        }
    }

    /**
     * Disconnect from Modbus server
     */
    disconnect() {
        this.stopPolling();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.client.isOpen) {
            this.client.close(() => {
                console.log('[ModbusService] Disconnected');
            });
        }

        this.connected = false;
        this.emit('disconnected');
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimer) return;

        console.log(`[ModbusService] Reconnecting in ${this.config.reconnectTimeout}ms...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.config.reconnectTimeout);
    }

    /**
     * Start polling for data
     */
    startPolling() {
        if (this.pollTimer) return;

        this.pollTimer = setInterval(async () => {
            try {
                await this.readAllRegisters();
            } catch (error) {
                console.error('[ModbusService] Poll error:', error.message);
                this.handleConnectionError(error);
            }
        }, this.config.pollInterval);

        // Immediate first read
        this.readAllRegisters().catch(err => {
            console.error('[ModbusService] Initial read error:', err.message);
        });
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Read all configured registers and parse data for ALL building sensors
     */
    async readAllRegisters() {
        const registers = registerMap.holding_registers;
        const data = {};

        // === GENERATOR & MAINS ===
        const stateRegs = await this.client.readHoldingRegisters(1000, 2);
        data.generatorState = this.parseRegisterValue(registers.generator_state, stateRegs.data[0]);
        data.transferState = this.parseRegisterValue(registers.transfer_state, stateRegs.data[1]);

        const mainsRegs = await this.client.readHoldingRegisters(1100, 11);
        data.mainsVoltageL1 = this.parseRegisterValue(registers.mains_voltage_l1, mainsRegs.data[0]);
        data.mainsVoltageL2 = this.parseRegisterValue(registers.mains_voltage_l2, mainsRegs.data[1]);
        data.mainsVoltageL3 = this.parseRegisterValue(registers.mains_voltage_l3, mainsRegs.data[2]);
        data.mainsFrequency = this.parseRegisterValue(registers.mains_frequency, mainsRegs.data[10]);

        const genRegs = await this.client.readHoldingRegisters(1200, 11);
        data.genVoltageL1 = this.parseRegisterValue(registers.gen_voltage_l1, genRegs.data[0]);
        data.genVoltageL2 = this.parseRegisterValue(registers.gen_voltage_l2, genRegs.data[1]);
        data.genVoltageL3 = this.parseRegisterValue(registers.gen_voltage_l3, genRegs.data[2]);
        data.genFrequency = this.parseRegisterValue(registers.gen_frequency, genRegs.data[10]);

        const engineRegs = await this.client.readHoldingRegisters(1300, 31);
        data.engineTemp = this.parseRegisterValue(registers.engine_temp, engineRegs.data[0]);
        data.oilPressure = this.parseRegisterValue(registers.oil_pressure, engineRegs.data[10]);
        data.fuelLevel = this.parseRegisterValue(registers.fuel_level, engineRegs.data[20]);
        data.batteryVoltage = this.parseRegisterValue(registers.battery_voltage, engineRegs.data[30]);

        const counterRegs = await this.client.readHoldingRegisters(1400, 11);
        const hoursLow = counterRegs.data[0];
        const hoursHigh = counterRegs.data[1];
        data.engineHours = (hoursHigh << 16) | hoursLow;
        data.generatorStarts = counterRegs.data[10];

        // === HYDRAULIC SYSTEM ===
        const tankRegs = await this.client.readHoldingRegisters(2100, 2);
        data.waterTankA = this.parseRegisterValue(registers.water_tank_a_level, tankRegs.data[0]);
        data.waterTankB = this.parseRegisterValue(registers.water_tank_b_level, tankRegs.data[1]);

        const pumpRegs = await this.client.readHoldingRegisters(2110, 12);
        data.pumpTorreAPressure = this.parseRegisterValue(registers.pump_torre_a_pressure, pumpRegs.data[0]);
        data.pumpTorreBPressure = this.parseRegisterValue(registers.pump_torre_b_pressure, pumpRegs.data[1]);
        data.pumpB1State = this.parseRegisterValue(registers.pump_b1_state, pumpRegs.data[10]);
        data.pumpB2State = this.parseRegisterValue(registers.pump_b2_state, pumpRegs.data[11]);

        const waterRegs = await this.client.readHoldingRegisters(2130, 11);
        data.waterFlowRate = this.parseRegisterValue(registers.water_flow_rate, waterRegs.data[0]);
        data.waterConsumedToday = this.parseRegisterValue(registers.water_consumed_today, waterRegs.data[10]);

        // === POOL MONITORING ===
        const poolRegs = await this.client.readHoldingRegisters(2200, 31);
        data.poolTemp = this.parseRegisterValue(registers.pool_temperature, poolRegs.data[0]);
        data.poolPH = this.parseRegisterValue(registers.pool_ph, poolRegs.data[10]);
        data.poolChlorine = this.parseRegisterValue(registers.pool_chlorine, poolRegs.data[20]);
        data.poolPumpState = this.parseRegisterValue(registers.pool_pump_state, poolRegs.data[30]);

        // === CLIMATE SENSORS ===
        const climateRegs = await this.client.readHoldingRegisters(2300, 11);
        data.tempExterior = this.parseRegisterValue(registers.temp_exterior, climateRegs.data[0]);
        data.tempInteriorHall = this.parseRegisterValue(registers.temp_interior_hall, climateRegs.data[1]);
        data.airQualityIndex = this.parseRegisterValue(registers.air_quality_index, climateRegs.data[10]);

        // === ELECTRICAL CONSUMPTION ===
        const electricRegs = await this.client.readHoldingRegisters(2400, 21);
        data.powerComunidad = this.parseRegisterValue(registers.power_comunidad, electricRegs.data[0]);
        data.powerTorreA = this.parseRegisterValue(registers.power_torre_a, electricRegs.data[10]);
        data.powerTorreB = this.parseRegisterValue(registers.power_torre_b, electricRegs.data[20]);

        // === ELECTRIC FENCE ===
        const fenceRegs = await this.client.readHoldingRegisters(2500, 2);
        data.fenceVoltage = this.parseRegisterValue(registers.fence_voltage, fenceRegs.data[0]);
        data.fenceStatus = this.parseRegisterValue(registers.fence_status, fenceRegs.data[1]);

        // === AC DRIVE (VFD) ===
        const vfdRegs = await this.client.readHoldingRegisters(2600, 21);
        data.vfdFrequency = this.parseRegisterValue(registers.vfd_frequency, vfdRegs.data[0]);
        data.vfdCurrent = this.parseRegisterValue(registers.vfd_current, vfdRegs.data[10]);
        data.vfdStatus = this.parseRegisterValue(registers.vfd_status, vfdRegs.data[20]);

        // === SMOKE DETECTORS ===
        const smokeRegs = await this.client.readHoldingRegisters(3000, 6);
        data.smokeDetectors = {
            zone1: smokeRegs.data[0],
            zone2: smokeRegs.data[1],
            zone3: smokeRegs.data[2],
            zone4: smokeRegs.data[3],
            zone5: smokeRegs.data[4],
            zone6: smokeRegs.data[5]
        };

        // === ALARMS ===
        const alarmRegs = await this.client.readHoldingRegisters(3100, 1);
        const alarmBitmap = alarmRegs.data[0];
        data.activeAlarms = this.parseAlarms(alarmBitmap);

        // Add metadata
        data.timestamp = new Date().toISOString();
        data.onMains = data.transferState === 1;
        data.onGenerator = data.transferState === 0;
        data.generatorRunning = data.generatorState === 2;

        // Store current data
        this.currentData = data;

        // Emit update
        this.emit('data-update', data);

        // Check for alarms (only emit if changed)
        if (alarmBitmap !== this.lastAlarmBitmap) {
            this.lastAlarmBitmap = alarmBitmap;

            if (data.activeAlarms.length > 0) {
                this.emit('alarm', {
                    alarms: data.activeAlarms,
                    timestamp: data.timestamp
                });
            }
        }

        return data;
    }

    /**
     * Parse register value with scaling
     */
    parseRegisterValue(registerConfig, rawValue) {
        if (!registerConfig) return rawValue;

        let value = rawValue;

        // Handle signed integers
        if (registerConfig.type === 'int16' && value > 32767) {
            value = value - 65536;
        }

        // Apply scaling
        if (registerConfig.scale) {
            value = value * registerConfig.scale;
        }

        return value;
    }

    /**
     * Parse alarm bitmap to array of active alarms
     */
    parseAlarms(bitmap) {
        const alarms = [];
        const alarmDefs = registerMap.alarm_bits;

        for (let bit = 0; bit < 16; bit++) {
            if (bitmap & (1 << bit)) {
                alarms.push({
                    bit: bit,
                    name: alarmDefs[bit.toString()] || `Unknown alarm ${bit}`,
                    active: true
                });
            }
        }

        return alarms;
    }

    /**
     * Handle connection errors
     */
    handleConnectionError(error) {
        if (this.connected) {
            console.error('❌ [ModbusService] Connection lost:', error.message);
            this.connected = false;
            this.stopPolling();
            this.emit('disconnected');
            this.scheduleReconnect();
        }
    }

    /**
     * Get current cached data
     */
    getCurrentStatus() {
        return {
            connected: this.connected,
            data: this.currentData,
            config: {
                host: this.config.host,
                port: this.config.port,
                pollInterval: this.config.pollInterval
            }
        };
    }
}

module.exports = ModbusService;
