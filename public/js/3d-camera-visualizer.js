/**
 * CameraVisualizer - Manages 3D visualization of cameras and their motion alerts
 */
class CameraVisualizer {
    constructor(sceneManager, condominiumModel = null) {
        this.sceneManager = sceneManager;
        this.condominiumModel = condominiumModel;
        this.cameras = {};
        this.activeCameras = new Map(); // camId -> {icon, coverageArea, motionEffect}
        this.activeMotionAlerts = new Set();
        this.zones = {};

        // Map elevator cameras to their buildings
        this.elevatorToBuildingMap = {
            'cam9': 'torreA',    // Ascensor Norte A
            'cam10': 'torreB',   // Ascensor Norte B
            'cam11': 'torreA',   // Ascensor Sur A
            'cam12': 'torreB',   // Ascensor Sur B
            'cam30': 'torreB',   // Entrada Ascensor T.B
            'cam32': 'torreA'    // Entrada Ascensor T.A
        };

        this.highlightedBuildings = new Map(); // buildingName -> timeoutId
    }

    async loadCameraPositions(url = '/js/camera-positions.json') {
        try {
            const response = await fetch(url);
            const data = await response.json();

            this.zones = data.zones;

            // Add each camera to the scene
            Object.entries(data.cameras).forEach(([camId, cameraData]) => {
                this.addCamera(camId, cameraData);
            });

            console.log(`✅ Loaded ${Object.keys(this.cameras).length} cameras`);
            return true;
        } catch (error) {
            console.error('❌ Error loading camera positions:', error);
            return false;
        }
    }

    addCamera(camId, cameraData) {
        this.cameras[camId] = cameraData;

        const group = new THREE.Group();
        group.name = camId;

        // Visuals disabled per client request
        /*
        // Create camera icon (small pyramid or cone)
        const icon = this.createCameraIcon(cameraData);
        group.add(icon);

        // Create coverage area (circle on the ground)
        const coverageArea = this.createCoverageArea(
            cameraData.coverageRadius,
            this.zones[cameraData.zone]?.color || '#ffffff'
        );
        group.add(coverageArea);
        */

        // Position the group
        group.position.set(
            cameraData.position.x,
            cameraData.position.y,
            cameraData.position.z
        );

        // Rotate if specified
        if (cameraData.rotation && cameraData.rotation.y !== undefined) {
            group.rotation.y = THREE.MathUtils.degToRad(cameraData.rotation.y);
        }

        this.sceneManager.add(group);

        this.activeCameras.set(camId, {
            group: group,
            // icon: icon, // Disabled
            // coverageArea: coverageArea, // Disabled
            data: cameraData
        });
    }

    createCameraIcon(cameraData) {
        // Create a cone pointing down (typical security camera look)
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            metalness: 0.6,
            roughness: 0.4
        });

        const cone = new THREE.Mesh(geometry, material);
        cone.rotation.x = Math.PI; // Point downward
        cone.position.y = 0.75; // Elevate slightly

        // Add a small sphere for the camera lens
        const lensGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const lensMaterial = new THREE.MeshStandardMaterial({
            color: 0x34495e,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x1a1a1a,
            emissiveIntensity: 0.2
        });

        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.y = 0.2;

        const cameraGroup = new THREE.Group();
        cameraGroup.add(cone);
        cameraGroup.add(lens);

        return cameraGroup;
    }

    createCoverageArea(radius, colorHex) {
        // Create a circle on the ground showing camera coverage
        const geometry = new THREE.CircleGeometry(radius, 32);
        const material = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });

        const circle = new THREE.Mesh(geometry, material);
        circle.rotation.x = -Math.PI / 2; // Lie flat on ground
        circle.position.y = -2.5; // Slightly below camera

        // Add ring outline
        const ringGeometry = new THREE.RingGeometry(radius - 0.2, radius, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -2.4;

        const areaGroup = new THREE.Group();
        areaGroup.add(circle);
        areaGroup.add(ring);

        return areaGroup;
    }

    activateMotionAlert(camId) {
        if (!this.activeCameras.has(camId)) {
            console.warn(`Camera ${camId} not found in scene`);
            return;
        }

        if (this.activeMotionAlerts.has(camId)) {
            console.log(`Motion alert already active for ${camId}`);
            return;
        }

        // Check if this is an elevator camera
        const buildingName = this.elevatorToBuildingMap[camId];

        if (buildingName && this.condominiumModel) {
            // Elevator camera - highlight the building instead
            console.log(`✅ Elevator motion detected in ${camId}, highlighting ${buildingName}`);

            // Clear any existing highlight timeout for this building
            if (this.highlightedBuildings.has(buildingName)) {
                clearTimeout(this.highlightedBuildings.get(buildingName));
            }

            // Highlight the building
            this.condominiumModel.highlightBuilding(buildingName);

            // Store that this building is highlighted
            this.highlightedBuildings.set(buildingName, null);

        } else {
            // Regular camera - show normal motion effect
            const camera = this.activeCameras.get(camId);
            const position = camera.data.position;

            // Create motion effect
            const motionEffect = this.createMotionEffect(position, camera.data.coverageRadius);
            camera.group.add(motionEffect);
            camera.motionEffect = motionEffect;
        }

        this.activeMotionAlerts.add(camId);
        console.log(`✅ Motion alert activated for ${camId} - ${this.cameras[camId].name}`);
    }

    createMotionEffect(position, radius) {
        const effectGroup = new THREE.Group();

        // 1. Pulsating yellow ring on the ground
        const ringGeometry = new THREE.RingGeometry(radius * 0.8, radius * 1.1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -2.3;
        effectGroup.add(ring);

        // 2. Vertical beam of light
        const beamGeometry = new THREE.CylinderGeometry(radius * 0.6, radius * 0.8, 15, 16);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.25
        });

        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.y = 5;
        effectGroup.add(beam);

        // 3. Point light for dramatic effect
        const pointLight = new THREE.PointLight(0xfacc15, 2, radius * 2);
        pointLight.position.y = 2;
        effectGroup.add(pointLight);

        // 4. Outer expanding ring (animated separately)
        const outerRingGeometry = new THREE.RingGeometry(radius * 1.2, radius * 1.3, 32);
        const outerRingMaterial = new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });

        const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
        outerRing.rotation.x = -Math.PI / 2;
        outerRing.position.y = -2.2;
        effectGroup.add(outerRing);

        // Store references for animation
        effectGroup.userData = {
            ring: ring,
            beam: beam,
            pointLight: pointLight,
            outerRing: outerRing,
            animationPhase: 0,
            radius: radius
        };

        // Start animation
        this.animateMotionEffect(effectGroup);

        return effectGroup;
    }

    animateMotionEffect(effectGroup) {
        const animate = () => {
            if (!effectGroup.parent) {
                // Effect has been removed, stop animation
                return;
            }

            const userData = effectGroup.userData;
            userData.animationPhase += 0.08;

            // Pulsating opacity
            const pulseOpacity = 0.4 + Math.sin(userData.animationPhase * 2) * 0.3;
            userData.ring.material.opacity = pulseOpacity;
            userData.beam.material.opacity = pulseOpacity * 0.5;

            // Expanding outer ring
            const expandScale = 1 + Math.sin(userData.animationPhase) * 0.15;
            userData.outerRing.scale.set(expandScale, expandScale, 1);
            userData.outerRing.material.opacity = 0.5 - Math.sin(userData.animationPhase) * 0.2;

            // Pulsating light intensity
            userData.pointLight.intensity = 1.5 + Math.sin(userData.animationPhase * 3) * 0.5;

            // Ring rotation
            userData.ring.rotation.z += 0.01;
            userData.outerRing.rotation.z -= 0.015;

            // Continue animation
            requestAnimationFrame(animate);
        };

        animate();
    }

    deactivateMotionAlert(camId) {
        if (!this.activeMotionAlerts.has(camId)) {
            return;
        }

        // Check if this was an elevator camera
        const buildingName = this.elevatorToBuildingMap[camId];

        if (buildingName && this.condominiumModel) {
            // Remove building highlight
            this.condominiumModel.removeHighlight(buildingName);

            // Clear timeout reference
            if (this.highlightedBuildings.has(buildingName)) {
                const timeoutId = this.highlightedBuildings.get(buildingName);
                if (timeoutId) clearTimeout(timeoutId);
                this.highlightedBuildings.delete(buildingName);
            }

            console.log(`✅ Building highlight removed for ${buildingName}`);
        } else {
            // Remove normal motion effect
            const camera = this.activeCameras.get(camId);
            if (camera && camera.motionEffect) {
                camera.group.remove(camera.motionEffect);
                camera.motionEffect = null;
            }
        }

        this.activeMotionAlerts.delete(camId);
        console.log(`✅ Motion alert deactivated for ${camId}`);
    }

    getActiveMotionAlerts() {
        return Array.from(this.activeMotionAlerts).map(camId => {
            const camera = this.cameras[camId];
            return {
                camId: camId,
                name: camera.name,
                zone: camera.zone
            };
        });
    }

    toggleCameraVisibility(show = true) {
        this.activeCameras.forEach((camera) => {
            camera.group.visible = show;
        });
    }

    getCameraByName(name) {
        const entry = Object.entries(this.cameras).find(([id, data]) =>
            data.name.toLowerCase().includes(name.toLowerCase())
        );
        return entry ? entry[0] : null;
    }
}
