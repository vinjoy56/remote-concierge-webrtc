/**
 * AlertVisualizer - Manages 3D alert markers and animations
 */
class AlertVisualizer {
    constructor(sceneManager, condominiumModel) {
        this.sceneManager = sceneManager;
        this.condominiumModel = condominiumModel;
        this.activeAlerts = [];
        this.alertTypes = this.defineAlertTypes();
        this.animationMixers = [];
    }

    defineAlertTypes() {
        return {
            fence: {
                name: 'Cerco Eléctrico',
                icon: '⚡',
                color: 0xff0000,
                colorHex: '#ff0000',
                zone: 'fence',
                height: 8
            },
            pumps: {
                name: 'Sala de Bombas',
                icon: '💧',
                color: 0x0000ff,
                colorHex: '#0000ff',
                zone: 'pumps',
                height: 12
            },
            fire: {
                name: 'Incendio',
                icon: '🔥',
                color: 0xff8800,
                colorHex: '#ff8800',
                zone: 'torreA',
                height: 35
            },
            electric: {
                name: 'Falla Eléctrica',
                icon: '⚡',
                color: 0xffff00,
                colorHex: '#ffff00',
                zone: 'generator',
                height: 10
            },
            water: {
                name: 'Nivel de Agua',
                icon: '🌊',
                color: 0x00ffff,
                colorHex: '#00ffff',
                zone: 'tanks',
                height: 15
            }
        };
    }

    addAlert(type) {
        const alertDef = this.alertTypes[type];
        if (!alertDef) {
            console.error(`Unknown alert type: ${type}`);
            return null;
        }

        // Get zone position
        const zonePos = this.condominiumModel.getZonePosition(alertDef.zone);
        if (!zonePos) {
            console.error(`Zone not found for alert type: ${type}`);
            return null;
        }

        // Create alert marker
        const marker = this.createMarker(alertDef, zonePos);

        // Create alert object
        const alert = {
            id: `alert_${type}_${Date.now()}`,
            type: type,
            name: alertDef.name,
            colorHex: alertDef.colorHex,
            marker: marker,
            timestamp: Date.now()
        };

        this.activeAlerts.push(alert);
        this.sceneManager.add(marker);

        console.log(`✅ Alert added: ${alertDef.name}`);
        return alert;
    }

    createMarker(alertDef, zonePos) {
        // Create a group to hold all marker components
        const markerGroup = new THREE.Group();

        // 1. Pulsating sphere
        const sphereGeometry = new THREE.SphereGeometry(2, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: alertDef.color,
            emissive: alertDef.color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        markerGroup.add(sphere);

        // 2. Outer glow ring
        const ringGeometry = new THREE.RingGeometry(3, 4, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: alertDef.color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        markerGroup.add(ring);

        // 3. Vertical beam of light
        const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, alertDef.height, 8);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: alertDef.color,
            transparent: true,
            opacity: 0.3
        });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.y = -alertDef.height / 2;
        markerGroup.add(beam);

        // 4. Point light for dramatic effect
        const pointLight = new THREE.PointLight(alertDef.color, 2, 30);
        pointLight.position.y = 0;
        markerGroup.add(pointLight);

        // Position the marker
        markerGroup.position.set(
            zonePos.x,
            zonePos.y + alertDef.height,
            zonePos.z
        );

        // Store animation data
        markerGroup.userData = {
            type: alertDef.type,
            animationPhase: 0,
            pulsateSpeed: 2,
            rotateSpeed: 1,
            sphere: sphere,
            ring: ring,
            beam: beam,
            light: pointLight
        };

        // Start animation
        this.animateMarker(markerGroup);

        return markerGroup;
    }

    animateMarker(markerGroup) {
        const animate = () => {
            if (!markerGroup.parent) {
                // Marker has been removed, stop animation
                return;
            }

            const userData = markerGroup.userData;
            userData.animationPhase += 0.05;

            // Pulsating effect
            const scale = 1 + Math.sin(userData.animationPhase * userData.pulsateSpeed) * 0.2;
            userData.sphere.scale.set(scale, scale, scale);

            // Opacity pulsation
            const opacity = 0.6 + Math.sin(userData.animationPhase * userData.pulsateSpeed) * 0.3;
            userData.ring.material.opacity = opacity * 0.5;

            // Rotation
            markerGroup.rotation.y += 0.01 * userData.rotateSpeed;
            userData.ring.rotation.z += 0.02;

            // Light intensity pulsation
            userData.light.intensity = 1.5 + Math.sin(userData.animationPhase * userData.pulsateSpeed) * 0.5;

            // Continue animation
            requestAnimationFrame(animate);
        };

        animate();
    }

    removeAlert(alertId) {
        const index = this.activeAlerts.findIndex(a => a.id === alertId);
        if (index === -1) {
            console.warn(`Alert not found: ${alertId}`);
            return false;
        }

        const alert = this.activeAlerts[index];
        this.sceneManager.remove(alert.marker);
        this.activeAlerts.splice(index, 1);

        console.log(`✅ Alert removed: ${alert.name}`);
        return true;
    }

    clearAll() {
        this.activeAlerts.forEach(alert => {
            this.sceneManager.remove(alert.marker);
        });
        this.activeAlerts = [];
        console.log('✅ All alerts cleared');
    }

    getActiveAlerts() {
        return this.activeAlerts.map(alert => ({
            id: alert.id,
            type: alert.type,
            name: alert.name,
            colorHex: alert.colorHex,
            timestamp: alert.timestamp
        }));
    }

    // Handle real-time socket alerts
    handleSocketAlert(alertData) {
        // Map socket alert types to visual alert types
        const typeMapping = {
            'fence_activated': 'fence',
            'pump_alert': 'pumps',
            'fire_detected': 'fire',
            'power_failure': 'electric',
            'water_level': 'water'
        };

        const visualType = typeMapping[alertData.type];
        if (visualType) {
            this.addAlert(visualType);
        }
    }
}
