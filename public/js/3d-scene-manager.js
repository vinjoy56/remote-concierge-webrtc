/**
 * SceneManager - Manages the Three.js scene, camera, renderer, and controls
 */
class SceneManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.Fog(0x0f172a, 100, 500);

        // Create camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(80, 60, 80);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add lights
        this.setupLights();

        // Add helpers
        this.addHelpers();

        // Setup controls
        this.setupControls();

        console.log('✅ SceneManager initialized');
    }

    setupLights() {
        // Ambient light (soft overall illumination)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Directional light (main light source - like sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;

        // Shadow settings
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;

        this.scene.add(directionalLight);

        // Hemisphere light (sky and ground color)
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2f4f4f, 0.4);
        this.scene.add(hemisphereLight);

        // Additional fill light
        const fillLight = new THREE.DirectionalLight(0x7ec8e3, 0.3);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);
    }

    addHelpers() {
        // Grid helper (ground reference)
        const gridSize = 200;
        const gridDivisions = 40;
        const gridHelper = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0x334155,
            0x1e293b
        );
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    setupControls() {
        if (typeof window.OrbitControls === 'undefined') {
            console.warn('⚠️ OrbitControls not loaded, controls will be disabled');
            return;
        }

        this.controls = new window.OrbitControls(this.camera, this.renderer.domElement);

        // Control settings
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 30;
        this.controls.maxDistance = 300;
        this.controls.maxPolarAngle = Math.PI / 2.1; // Prevent going below ground

        // Auto rotate (optional)
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;

        console.log('✅ OrbitControls initialized');
    }

    startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);

            // Update controls
            if (this.controls) {
                this.controls.update();
            }

            // Render scene
            this.renderer.render(this.scene, this.camera);
        };

        animate();
        console.log('✅ Animation loop started');
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    onWindowResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    getControls() {
        return this.controls;
    }

    enableAutoRotate(enable = true) {
        if (this.controls) {
            this.controls.autoRotate = enable;
        }
    }

    dispose() {
        this.stopAnimation();

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.controls) {
            this.controls.dispose();
        }
    }
}
