/**
 * CondominiumModel - Builds and manages the 3D model of the condominium
 */
class CondominiumModel {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.zones = {};
        this.labels = [];
    }

    build() {
        // Build all zones
        this.buildTowers();
        this.buildFence();
        this.buildPumpRoom();
        this.buildWaterTanks();
        this.buildPool();
        this.buildPoolPump();
        this.buildGenerator();
        this.buildElectricalPanels();
        this.buildEntrances();
        this.buildGround();

        // Calibration mode disabled after final adjustment
        // this.enableCalibration();

        console.log('✅ Condominium model built');
    }

    // ... existing buildings methods ...

    // ... (buildGenerator, buildPoolPump, etc. are already there) ...

    // Calibration tools removed for production

    // ... existing buildings methods ...

    buildGround() {
        // Load floor plan texture for overlay
        const textureLoader = new THREE.TextureLoader();
        const floorPlanTexture = textureLoader.load('img/floor-plan.png');

        // Configure texture filtering for better quality
        floorPlanTexture.magFilter = THREE.LinearFilter;
        floorPlanTexture.minFilter = THREE.LinearMipMapLinearFilter;

        // Ground geometry (16:9 aspect ratio to avoid stretching)
        // Image resolution is 1024x576, ratio ~1.77
        // Let's use a base height of 150 units, so width should be ~266
        const width = 266;
        const height = 150;

        const groundGeometry = new THREE.PlaneGeometry(width, height);

        const groundMaterial = new THREE.MeshStandardMaterial({
            map: floorPlanTexture,
            color: 0xffffff, // White base to show texture colors
            roughness: 0.9,
            metalness: 0.1,
            transparent: true,
            opacity: 0.6, // Slightly more transparent for final view
            side: THREE.DoubleSide
        });

        this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundMesh.rotation.x = -Math.PI / 2;

        // --- FINAL CALIBRATION VALUES (User Provided) ---
        // Pos: 18.00, -0.40, -5.50 | Rot: 0.0° | Scale: 0.730, 0.730, 0.710
        this.groundMesh.position.set(18.00, -0.4, -5.50);
        this.groundMesh.rotation.z = 0;
        this.groundMesh.scale.set(0.730, 0.730, 0.710);

        this.groundMesh.receiveShadow = true;
        this.sceneManager.add(this.groundMesh);
    }


    buildTowers() {
        // Torre A
        const torreA = this.createBuilding({
            width: 24,
            height: 60,
            depth: 18,
            color: 0x34495e,
            position: { x: -26.50, y: 30, z: 14.00 }
        });
        torreA.scale.set(1.220, 1.010, 1.330);
        this.sceneManager.add(torreA);
        this.zones.torreA = torreA;
        this.addLabel('Torre A', torreA.position, 35);

        // Torre B
        const torreB = this.createBuilding({
            width: 24,
            height: 60,
            depth: 18,
            color: 0x2c3e50,
            position: { x: 7.50, y: 30, z: -22.50 }
        });
        torreB.scale.set(1.210, 1.000, 1.390);
        this.sceneManager.add(torreB);
        this.zones.torreB = torreB;
        this.addLabel('Torre B', torreB.position, 35);
    }

    buildFence() {
        // Cerco perimetral RECTANGULAR
        const fenceColor = 0xe74c3c;
        const fenceHeight = 3;
        const fenceThickness = 1;

        const width = 120;
        const depth = 85; // Reduced from 120 based on user feedback (17/24 ratio)

        // Norte
        const fenceNorth = this.createBox({
            width: width,
            height: fenceHeight,
            depth: fenceThickness,
            color: fenceColor,
            position: { x: 0, y: fenceHeight / 2, z: -depth / 2 }
        });
        this.sceneManager.add(fenceNorth);

        // Sur
        const fenceSouth = this.createBox({
            width: width,
            height: fenceHeight,
            depth: fenceThickness,
            color: fenceColor,
            position: { x: 0, y: fenceHeight / 2, z: depth / 2 }
        });
        this.sceneManager.add(fenceSouth);

        // Este
        const fenceEast = this.createBox({
            width: fenceThickness,
            height: fenceHeight,
            depth: depth,
            color: fenceColor,
            position: { x: width / 2, y: fenceHeight / 2, z: 0 }
        });
        this.sceneManager.add(fenceEast);

        // Oeste
        const fenceWest = this.createBox({
            width: fenceThickness,
            height: fenceHeight,
            depth: depth,
            color: fenceColor,
            position: { x: -width / 2, y: fenceHeight / 2, z: 0 }
        });
        this.sceneManager.add(fenceWest);

        this.zones.fence = fenceNorth.position.clone();
        this.addLabel('Cerco Eléctrico', this.zones.fence, 8);
    }

    buildPumpRoom() {
        // Sala de Bombas
        const pumpRoom = this.createBuilding({
            width: 6,
            height: 4,
            depth: 5,
            color: 0x3498db,
            position: { x: 46.50, y: 2, z: -19.50 }
        });
        pumpRoom.scale.set(2.370, 1.250, 2.540);
        this.sceneManager.add(pumpRoom);
        this.zones.pumps = pumpRoom.position;
        this.addLabel('Sala de Bombas', pumpRoom.position, 8);
    }

    buildWaterTanks() {
        // Two cylindrical tanks - Adjusted Z
        const tankRadius = 2.5;
        const tankHeight = 8;
        const tankColor = 0x1abc9c;

        // Tank 1
        const tank1Geometry = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 32);
        const tank1Material = new THREE.MeshStandardMaterial({
            color: tankColor,
            metalness: 0.3,
            roughness: 0.4
        });
        const tank1 = new THREE.Mesh(tank1Geometry, tank1Material);
        tank1.position.set(43.00, 2.50, -32.00); // Y adjusted for new scale height possibly
        tank1.scale.set(1.340, 0.620, 1.530);
        tank1.castShadow = true;
        tank1.receiveShadow = true;
        this.sceneManager.add(tank1);

        // Tank 2
        const tank2 = tank1.clone();
        tank2.position.set(50.00, 3.00, -32.50);
        tank2.scale.set(1.430, 0.730, 1.570);
        this.sceneManager.add(tank2);

        this.zones.tanks = tank1.position.clone();
        this.addLabel('Tanques de Agua', this.zones.tanks, 10);
    }

    buildPool() {
        // Pool
        const pool = this.createBox({
            width: 25,
            height: 0.5,
            depth: 10,
            color: 0xf39c12,
            position: { x: 0, y: 0.25, z: 14 } // Initial position, will be overwritten
        });
        pool.position.set(38.50, 0.00, 0.50);
        pool.scale.set(0.350, 1.250, 1.380);

        pool.material.transparent = true;
        pool.material.opacity = 0.7;
        pool.material.emissive = new THREE.Color(0x2980b9);
        pool.material.emissiveIntensity = 0.3;
        this.sceneManager.add(pool);

        this.zones.pool = pool.position;
        this.addLabel('Piscina', pool.position, 6);
    }

    buildGenerator() {
        // Generator
        const generator = this.createBuilding({
            width: 5,
            height: 3.5,
            depth: 4,
            color: 0x9b59b6,
            position: { x: 52.50, y: 1.75, z: -11.00 }
        });
        generator.scale.set(0.860, 1.000, 1.080);
        this.sceneManager.add(generator);
        this.zones.generator = generator.position;
        this.addLabel('Generador', generator.position, 6);
    }

    buildPoolPump() {
        // Pool pump
        const poolPump = this.createBuilding({
            width: 2,
            height: 1.5,
            depth: 2,
            color: 0x16a085,
            position: { x: 45.00, y: 0.75, z: -8.00 }
        });
        poolPump.scale.set(2.100, 2.100, 2.100);
        this.sceneManager.add(poolPump);
        this.zones.poolPump = poolPump.position;
        this.addLabel('Bomba Piscina', poolPump.position, 5);
    }

    buildElectricalPanels() {
        const panelColor = 0xf39c12;
        const panelWidth = 1.5;
        const panelHeight = 2.5;
        const panelDepth = 0.5;

        // Tablero Torre A
        const panelTorreA = this.createBuilding({
            width: panelWidth,
            height: panelHeight,
            depth: panelDepth,
            color: panelColor,
            position: { x: -11.00, y: 1.5, z: 23.00 }
        });
        panelTorreA.scale.set(0.980, 1.000, 7.550);
        this.sceneManager.add(panelTorreA);
        this.zones.panelTorreA = panelTorreA.position;
        this.addLabel('T. Eléctrico A', panelTorreA.position, 5);

        // Tablero Torre B
        const panelTorreB = this.createBuilding({
            width: panelWidth,
            height: panelHeight,
            depth: panelDepth,
            color: panelColor,
            position: { x: 23.00, y: 1.5, z: -14.00 }
        });
        panelTorreB.scale.set(1.060, 1.000, 8.050);
        this.sceneManager.add(panelTorreB);
        this.zones.panelTorreB = panelTorreB.position;
        this.addLabel('T. Eléctrico B', panelTorreB.position, 5);

        // Tablero General Alumbrado
        const panelGeneral = this.createBuilding({
            width: panelWidth,
            height: panelHeight,
            depth: panelDepth,
            color: panelColor,
            position: { x: 38.00, y: 2.00, z: 20.50 }
        });
        panelGeneral.scale.set(11.210, 1.900, 25.840);
        this.sceneManager.add(panelGeneral);
        this.zones.panelGeneral = panelGeneral.position;
        this.addLabel('T. General', panelGeneral.position, 5);
    }

    buildEntrances() {
        const entranceColor = 0x95a5a6;
        const entranceWidth = 12;
        const entranceHeight = 0.5;
        const entranceDepth = 6;

        // Entrada Vehicular
        const entranceVehicular = this.createBuilding({
            width: entranceWidth,
            height: entranceHeight,
            depth: entranceDepth,
            color: entranceColor,
            position: { x: -24.00, y: 1.25, z: 41.00 }
        });
        entranceVehicular.scale.set(2.750, 7.250, 1.080);
        this.sceneManager.add(entranceVehicular);
        this.zones.entranceVehicular = entranceVehicular.position;
        this.addLabel('Entrada Vehicular', entranceVehicular.position, 6);

        // Entrada Peatonal
        const entrancePeatonal = this.createBuilding({
            width: entranceWidth,
            height: entranceHeight,
            depth: entranceDepth,
            color: entranceColor,
            position: { x: 38.00, y: 1.25, z: 40.50 }
        });
        entrancePeatonal.scale.set(1.370, 7.090, 1.130);
        this.sceneManager.add(entrancePeatonal);
        this.zones.entrancePeatonal = entrancePeatonal.position;
        this.addLabel('Entrada Peatonal', entrancePeatonal.position, 6);
    }



    // Helper methods
    createBuilding({ width, height, depth, color, position }) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(position.x, position.y, position.z);
        building.castShadow = true;
        building.receiveShadow = true;

        // Add edge highlight
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.3
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        building.add(wireframe);

        return building;
    }

    createBox({ width, height, depth, color, position }) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
        const box = new THREE.Mesh(geometry, material);
        box.position.set(position.x, position.y, position.z);
        box.castShadow = true;
        box.receiveShadow = true;
        return box;
    }


    // Method to highlight a building (for elevator alerts)
    highlightBuilding(buildingName, color = 0xfacc15) {
        const buildingMesh = this.zones[buildingName];

        if (!buildingMesh || !(buildingMesh instanceof THREE.Mesh)) {
            console.warn(`Building mesh for ${buildingName} not found.`);
            return null;
        }

        // Store original material if not already stored
        if (!buildingMesh.userData.originalMaterial) {
            buildingMesh.userData.originalMaterial = buildingMesh.material.clone();
        }

        // Apply glowing yellow material
        buildingMesh.material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.3,
            roughness: 0.5,
            emissive: color,
            emissiveIntensity: 0.5
        });

        console.log(`✅ Highlighted ${buildingName}`);
        return buildingMesh;
    }

    // Method to remove highlight from building
    removeHighlight(buildingName) {
        const buildingMesh = this.zones[buildingName];

        if (!buildingMesh || !buildingMesh.userData.originalMaterial) {
            return;
        }

        // Restore original material
        buildingMesh.material = buildingMesh.userData.originalMaterial;
        buildingMesh.userData.originalMaterial = null;

        console.log(`✅ Removed highlight from ${buildingName}`);
    }

    addLabel(text, position, heightOffset = 0) {
        // Create text sprite (simplified version using canvas)
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        // Background
        context.fillStyle = 'rgba(15, 23, 42, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Border
        context.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        context.lineWidth = 4;
        context.strokeRect(0, 0, canvas.width, canvas.height);

        // Text
        context.fillStyle = '#f8fafc';
        context.font = 'bold 48px Inter, Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.position.set(
            position.x,
            position.y + heightOffset,
            position.z
        );
        sprite.scale.set(20, 5, 1);

        this.sceneManager.add(sprite);
        this.labels.push(sprite);
    }

    getZonePosition(zoneName) {
        return this.zones[zoneName] || new THREE.Vector3(0, 0, 0);
    }

    getZones() {
        return this.zones;
    }
}
