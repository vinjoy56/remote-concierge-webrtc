const EventEmitter = require('events');

class SensorManager extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.state = {
            electricFence: { voltage: 0, status: 'disarmed', alarm: false, impedance: 0, energy: 0 },
            smokeDetectors: [],
            hydraulic: { tankLevel: 0, pumps: [], systemPressure: 0, flowRate: 0, oilTemp: 0 },
            acDrive: { frequency: 0, current: 0, rpm: 0, status: 'stopped', torque: 0, dcBus: 0, temperature: 0 },
            shellyEM: { voltage: 0, current: 0, power: 0, energy: 0, pf: 0 }
        };
        this.simulationInterval = null;
    }

    init() {
        if (!this.config.sensors) return;

        // Electric Fence
        this.state.electricFence.voltage = 0;
        this.state.electricFence.impedance = 500;
        this.state.electricFence.energy = 0;

        // Smoke Detectors
        this.state.smokeDetectors = this.config.sensors.smokeDetectors.zones.map(zone => ({
            zone: zone,
            status: 'normal',
            value: 0.1, // Obscuration %
            lastMaintenance: new Date().toISOString().split('T')[0]
        }));

        // Hydraulic
        this.state.hydraulic.tankLevel = this.config.sensors.hydraulic.tankCapacityLitres * 0.8;
        this.state.hydraulic.systemPressure = 0;
        this.state.hydraulic.flowRate = 0;
        this.state.hydraulic.oilTemp = 45; // Celsius
        for (let i = 0; i < this.config.sensors.hydraulic.pumpCount; i++) {
            this.state.hydraulic.pumps.push({ id: i + 1, status: 'off' });
        }

        // Shelly EM
        this.state.shellyEM.voltage = 220;
        this.state.shellyEM.energy = 10000;
    }

    startSimulation() {
        if (!this.config.simulation.enabled || !this.config.sensors) return;

        console.log('🧪 Starting Sensor Simulation...');

        this.simulationInterval = setInterval(() => {
            this._simulateElectricFence();
            this._simulateHydraulic();
            this._simulateACDrive();
            this._simulateShelly();
            this._simulateSmoke();

            // Emit update event
            this.emit('update', this.state);
        }, 2000);
    }

    stopSimulation() {
        if (this.simulationInterval) clearInterval(this.simulationInterval);
    }

    // --- ACTIONS (Called from WebSocket) ---
    setFenceStatus(status) {
        this.state.electricFence.status = status;
        this.emit('update', this.state); // Immediate update
        return status === 'armed' ? '⚡ Cerco eléctrico ARMADO' : '⚪ Cerco eléctrico DESARMADO';
    }

    setAcDriveStatus(status) {
        this.state.acDrive.status = status;
        this.emit('update', this.state);
        return `⚙️ Variador de frecuencia ${status === 'running' ? 'INICIADO' : 'DETENIDO'}`;
    }


    // --- INTERNAL SIMULATION LOGIC ---

    _simulateElectricFence() {
        if (this.state.electricFence.status === 'armed') {
            const base = 10000;
            const fluctuation = (Math.random() - 0.5) * 500;
            this.state.electricFence.voltage = Math.floor(base + fluctuation);
            this.state.electricFence.impedance = Math.floor(450 + Math.random() * 100);
            this.state.electricFence.energy = (2 + Math.random()).toFixed(2);
        } else {
            this.state.electricFence.voltage = 0;
            this.state.electricFence.impedance = 0;
            this.state.electricFence.energy = 0;
        }
    }

    _simulateHydraulic() {
        this.state.hydraulic.tankLevel -= Math.random() * 5;

        let activePumps = 0;
        if (this.state.hydraulic.tankLevel < 1000) {
            this.state.hydraulic.tankLevel += 50;
            this.state.hydraulic.pumps.forEach(p => p.status = 'on');
            activePumps = this.state.hydraulic.pumps.length;
        } else if (this.state.hydraulic.tankLevel > 4800) {
            this.state.hydraulic.pumps.forEach(p => p.status = 'off');
            activePumps = 0;
        }

        if (activePumps > 0) {
            this.state.hydraulic.systemPressure = (120 + Math.random() * 5).toFixed(1);
            this.state.hydraulic.flowRate = (500 + Math.random() * 20).toFixed(0);
            this.state.hydraulic.oilTemp = Math.min(65, this.state.hydraulic.oilTemp + 0.05);
        } else {
            this.state.hydraulic.systemPressure = Math.max(0, this.state.hydraulic.systemPressure - 2);
            this.state.hydraulic.flowRate = 0;
            this.state.hydraulic.oilTemp = Math.max(20, this.state.hydraulic.oilTemp - 0.01);
        }
    }

    _simulateACDrive() {
        if (this.state.acDrive.status === 'running') {
            const targetFreq = 50;
            if (this.state.acDrive.frequency < targetFreq) this.state.acDrive.frequency += 0.5;
            this.state.acDrive.current = (this.state.acDrive.frequency / 60) * 12 + (Math.random() * 0.5);
            this.state.acDrive.rpm = Math.floor(this.state.acDrive.frequency * 30);

            this.state.acDrive.torque = (85 + Math.random() * 5).toFixed(1);
            this.state.acDrive.dcBus = (540 + Math.random() * 10).toFixed(0);
            this.state.acDrive.temperature = Math.min(70, this.state.acDrive.temperature + 0.02);
        } else {
            if (this.state.acDrive.frequency > 0) this.state.acDrive.frequency -= 0.5;
            this.state.acDrive.current = 0;
            this.state.acDrive.rpm = 0;
            this.state.acDrive.torque = 0;
            this.state.acDrive.dcBus = 540;
            this.state.acDrive.temperature = Math.max(25, this.state.acDrive.temperature - 0.01);
        }
    }

    _simulateShelly() {
        this.state.shellyEM.voltage = (220 + (Math.random() - 0.5) * 5).toFixed(1);
        this.state.shellyEM.current = (Math.random() * 10).toFixed(2);
        this.state.shellyEM.power = (this.state.shellyEM.voltage * this.state.shellyEM.current * 0.9).toFixed(0);
        this.state.shellyEM.pf = (0.85 + Math.random() * 0.14).toFixed(2);
        this.state.shellyEM.energy += (this.state.shellyEM.power / 3600 / 1000);
    }

    _simulateSmoke() {
        this.state.smokeDetectors.forEach(s => {
            s.value = (Math.random() * 0.5).toFixed(2);
        });
    }
}

module.exports = SensorManager;
