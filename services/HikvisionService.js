const EventEmitter = require('events');

class HikvisionService extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.pythonProcesses = []; // Array to hold multiple processes

        // Define NVR configurations
        this.nvrs = [
            {
                ip: '192.168.0.100',
                user: 'admin',
                pass: 'j408688271A',
                name: 'NVR #1'
            },
            {
                ip: '192.168.0.101',
                user: 'admin',
                pass: 'j408688271A',
                name: 'NVR #2'
            }
        ];
    }

    startPolling() {
        console.log('📹 Hikvision Integration Service Started');
        this.startProcesses();
    }

    startProcesses() {
        const { spawn } = require('child_process');
        const path = require('path');
        const scriptPath = path.join(__dirname, '..', 'monitor_events.py');

        // Start one process per NVR
        this.nvrs.forEach((nvr, index) => {
            console.log(`📡 Spawning Python script for ${nvr.name} (${nvr.ip})`);

            const pythonProcess = spawn('python', [
                scriptPath,
                nvr.ip,
                nvr.user,
                nvr.pass
            ]);

            pythonProcess.nvrIp = nvr.ip; // Tag the process with its NVR IP
            pythonProcess.nvrName = nvr.name;

            pythonProcess.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (!line.trim()) return;
                    try {
                        const event = JSON.parse(line);

                        if (event.status) {
                            console.log(`🐍 [${nvr.name}] Python Status: ${event.message}`);
                        } else if (event.error) {
                            console.error(`🐍 [${nvr.name}] Python Error: ${event.error}`);
                        } else if (event.type === 'motion') {
                            // Add NVR IP to the event for proper camera lookup
                            event.nvrIp = nvr.ip;

                            // Map NVR channel to camera ID using config metadata
                            const camMetadata = this.config.cameras.metadata;
                            const camId = this.findCameraByLogicalId(event.channel, event.nvrIp, camMetadata);

                            if (camId) {
                                const cameraName = camMetadata[camId].name || camId;
                                this.emit('event', {
                                    type: 'motion',
                                    camId: camId,
                                    channel: event.channel,
                                    cameraName: cameraName,
                                    nvrIp: nvr.ip,
                                    message: `🏃 Movimiento detectado en ${cameraName}`,
                                    timestamp: new Date()
                                });
                            }
                        }
                    } catch (e) {
                        console.error(`[${nvr.name}] Error parsing python output:`, line);
                    }
                });
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`🐍 [${nvr.name}] Python Stderr: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                console.log(`🐍 [${nvr.name}] Python process exited with code ${code}. Restarting in 5s...`);
                setTimeout(() => this.restartProcess(index), 5000);
            });

            this.pythonProcesses.push(pythonProcess);
        });
    }

    restartProcess(index) {
        const { spawn } = require('child_process');
        const path = require('path');
        const scriptPath = path.join(__dirname, '..', 'monitor_events.py');
        const nvr = this.nvrs[index];

        console.log(`🔄 Restarting Python script for ${nvr.name} (${nvr.ip})`);

        const pythonProcess = spawn('python', [
            scriptPath,
            nvr.ip,
            nvr.user,
            nvr.pass
        ]);

        pythonProcess.nvrIp = nvr.ip;
        pythonProcess.nvrName = nvr.name;

        // Re-attach event listeners (same as above)
        pythonProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                if (!line.trim()) return;
                try {
                    const event = JSON.parse(line);

                    if (event.status) {
                        console.log(`🐍 [${nvr.name}] Python Status: ${event.message}`);
                    } else if (event.error) {
                        console.error(`🐍 [${nvr.name}] Python Error: ${event.error}`);
                    } else if (event.type === 'motion') {
                        event.nvrIp = nvr.ip;
                        const camMetadata = this.config.cameras.metadata;
                        const camId = this.findCameraByLogicalId(event.channel, event.nvrIp, camMetadata);

                        if (camId) {
                            const cameraName = camMetadata[camId].name || camId;
                            this.emit('event', {
                                type: 'motion',
                                camId: camId,
                                channel: event.channel,
                                cameraName: cameraName,
                                nvrIp: nvr.ip,
                                message: `🏃 Movimiento detectado en ${cameraName}`,
                                timestamp: new Date()
                            });
                        }
                    }
                } catch (e) {
                    console.error(`[${nvr.name}] Error parsing python output:`, line);
                }
            });
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`🐍 [${nvr.name}] Python Stderr: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`🐍 [${nvr.name}] Python process exited with code ${code}. Restarting in 5s...`);
            setTimeout(() => this.restartProcess(index), 5000);
        });

        this.pythonProcesses[index] = pythonProcess;
    }


    stopPolling() {
        this.pythonProcesses.forEach(proc => {
            if (proc) {
                proc.kill();
            }
        });
        this.pythonProcesses = [];
    }

    /**
     * Find camera ID by NVR logical channel ID and NVR IP
     * @param {string|number} logicalId - Channel ID from NVR (e.g., 33, 36, 40)
     * @param {string} nvrIp - IP address of the NVR that generated the event
     * @param {object} metadata - Camera metadata from config.json
     * @returns {string|null} - Camera ID (e.g., "cam1") or null if not found
     */
    findCameraByLogicalId(logicalId, nvrIp, metadata) {
        const parsed = parseInt(logicalId);
        for (const [camId, data] of Object.entries(metadata)) {
            // Match both logicalId and nvrIp (if nvrIp exists in metadata)
            const matchesLogicalId = data.logicalId === parsed;
            const matchesNvr = !data.nvrIp || data.nvrIp === nvrIp;

            if (matchesLogicalId && matchesNvr) {
                return camId;
            }
        }
        console.warn(`⚠️ No camera found for NVR ${nvrIp}, channel ${logicalId}`);
        return null;
    }
}

module.exports = HikvisionService;
