const EventEmitter = require('events');

class AIService extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.processing = false;
    }

    /**
     * Entry point for an event (e.g., Camera Motion or Sensor Trigger)
     * This simulates the "Local Gateway" logic deciding whether to escalate.
     */
    async analyzeEvent(triggerData) {
        // --- TIER 1: LOCAL LIGHTWEIGHT FILTER ---
        // In real world: Run TensorFlow.js / YOLO Nano on the Gateway
        // Here: Simulate a "Motion Score"
        const motionScore = Math.random(); // 0.0 to 1.0

        console.log(`🧠 AI Tier 1 (Local): Analizando evento de ${triggerData.source}... Score: ${motionScore.toFixed(2)}`);

        if (motionScore < 0.6) {
            console.log(`📉 AI Tier 1: Descartado (Ruido/Falso Positivo)`);
            return; // Stop here, save cloud costs
        }

        // --- TIER 2: CLOUD HEAVY ANALYSIS ---
        // If we passed the filter, we engage the heavy model
        console.log(`🚀 AI Tier 1: ALERTA POSIBLE. Escalando a Nube (Tier 2)...`);

        await this._simulateCloudInference(triggerData);
    }

    async _simulateCloudInference(data) {
        // Simulate network latency and processing time (e.g. 1-2 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Random decision from "Heavy Model"
        const isThreat = Math.random() > 0.3; // 70% chance it confirms the filtering

        if (isThreat) {
            console.log(`🚨 AI Tier 2 (Cloud): AMENAZA CONFIRMADA. Notificando Conserje.`);
            this.emit('alert', {
                level: 'critical',
                source: data.source,
                message: `🤖 IA Detectó actividad sospechosa en ${data.source}`,
                timestamp: new Date()
            });
        } else {
            console.log(`✅ AI Tier 2 (Cloud): Análisis profundo descartó la amenaza.`);
        }
    }
}

module.exports = AIService;
