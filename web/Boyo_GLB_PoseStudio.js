/**
 * Boyo GLB Pose Studio - GLB model loader and pose editor
 * 
 * Built following VNCCS Pose Studio patterns
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Determine the extension's base URL dynamically
const EXTENSION_URL = new URL(".", import.meta.url).toString();

// === Three.js Module Loader (with GLTFLoader added) ===
const THREE_VERSION = "0.160.0";
const THREE_SOURCES = {
    core: `https://esm.sh/three@${THREE_VERSION}?dev`,
    orbit: `https://esm.sh/three@${THREE_VERSION}/examples/jsm/controls/OrbitControls?dev`,
    transform: `https://esm.sh/three@${THREE_VERSION}/examples/jsm/controls/TransformControls?dev`,
    gltf: `https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader?dev`
};

const ThreeModuleLoader = {
    promise: null,
    async load() {
        if (!this.promise) {
            this.promise = Promise.all([
                import(THREE_SOURCES.core),
                import(THREE_SOURCES.orbit),
                import(THREE_SOURCES.transform),
                import(THREE_SOURCES.gltf)
            ]).then(([core, orbit, transform, gltf]) => ({
                THREE: core,
                OrbitControls: orbit.OrbitControls,
                TransformControls: transform.TransformControls,
                GLTFLoader: gltf.GLTFLoader
            }));
        }
        return this.promise;
    }
};

// === Styles ===
const STYLES = `
/* Boyo GLB Pose Studio Theme */
:root {
    --glb-bg: #1e1e1e;
    --glb-panel: #252525;
    --glb-border: #333;
    --glb-accent: #3558c7;
    --glb-text: #e0e0e0;
    --glb-text-muted: #888;
    --glb-input-bg: #151515;
}

.boyo-glb-studio {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    background: var(--glb-bg);
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    color: var(--glb-text);
    overflow: hidden;
    box-sizing: border-box;
    pointer-events: none;
    position: relative;
}

.boyo-glb-left {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    overflow-y: auto;
    border-right: 1px solid var(--glb-border);
    pointer-events: auto;
    zoom: 0.75;
}

.boyo-glb-left::-webkit-scrollbar { width: 6px; }
.boyo-glb-left::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

.boyo-glb-center {
    flex: 1;
    min-width: 600px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    pointer-events: auto;
}

.boyo-glb-canvas {
    flex: 1;
    position: relative;
    background: #000000;
    overflow: hidden;
    min-height: 500px;
}

.boyo-glb-section {
    background: var(--glb-panel);
    border: 1px solid var(--glb-border);
    border-radius: 4px;
    overflow: hidden;
}

.boyo-glb-section-header {
    padding: 8px 12px;
    background: #2a2a2a;
    cursor: pointer;
    user-select: none;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.boyo-glb-section-content {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.boyo-glb-btn {
    background: var(--glb-accent);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
}

.boyo-glb-btn:hover {
    background: #4264d9;
}

.boyo-glb-file-input {
    background: var(--glb-input-bg);
    color: var(--glb-text);
    padding: 8px;
    border: 1px solid var(--glb-border);
    border-radius: 4px;
    width: 100%;
    font-size: 11px;
}

.boyo-glb-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.boyo-glb-label {
    font-size: 11px;
    color: var(--glb-text-muted);
    font-weight: 500;
}

.boyo-glb-slider-container {
    display: flex;
    align-items: center;
    gap: 8px;
}

.boyo-glb-slider {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--glb-input-bg);
    outline: none;
    -webkit-appearance: none;
}

.boyo-glb-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--glb-accent);
    cursor: pointer;
}

.boyo-glb-value {
    min-width: 45px;
    font-size: 11px;
    color: var(--glb-text);
    text-align: right;
}

.boyo-glb-status {
    padding: 8px;
    background: var(--glb-input-bg);
    border-radius: 4px;
    font-size: 11px;
    color: var(--glb-text-muted);
    text-align: center;
}
`;

// === GLB Viewer (Three.js Wrapper) ===
class GLBViewer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.model = null;
        this.skeleton = null;
        this.bones = {};
        this.lights = [];
        this.animationFrameId = null;
        
        this.init();
    }
    
    async init() {
        const modules = await ThreeModuleLoader.load();
        const THREE = modules.THREE;
        this.THREE = THREE; // Store for later use
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            50,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.5, 3);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        this.canvas = this.renderer.domElement; // Store for capture
        
        // Controls
        this.controls = new modules.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 1, 0);
        this.controls.update();
        
        // Lights
        this.setupLights(THREE);
        
        // Grid
        const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        this.scene.add(grid);
        this.gridHelper = grid;
        
        // Start animation loop
        this.animate();
    }
    
    setupLights(THREE) {
        // Clear existing lights
        this.lights.forEach(light => this.scene.remove(light));
        this.lights = [];
        
        // Ambient
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        this.lights.push(ambient);
        
        // Directional
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 7.5);
        this.scene.add(directional);
        this.lights.push(directional);
    }
    
    updateLights(lightParams) {
        if (!this.THREE || !lightParams) return;
        
        // Clear existing lights
        this.lights.forEach(light => this.scene.remove(light));
        this.lights = [];
        
        // Add lights from params
        for (const params of lightParams) {
            let light;
            const color = typeof params.color === 'string' ? params.color : '#ffffff';
            const intensity = params.intensity || 1.0;
            
            if (params.type === 'ambient') {
                light = new this.THREE.AmbientLight(color, intensity);
            } else if (params.type === 'directional') {
                light = new this.THREE.DirectionalLight(color, intensity);
                light.position.set(params.x || 0, params.y || 10, params.z || 0);
            } else if (params.type === 'point') {
                light = new this.THREE.PointLight(color, intensity, 100);
                light.position.set(params.x || 0, params.y || 10, params.z || 0);
            }
            
            if (light) {
                this.scene.add(light);
                this.lights.push(light);
            }
        }
    }
    
    async loadGLB(file) {
        const modules = await ThreeModuleLoader.load();
        const THREE = modules.THREE;
        const loader = new modules.GLTFLoader();
        
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            
            loader.load(
                url,
                (gltf) => {
                    // Remove previous model
                    if (this.model) {
                        this.scene.remove(this.model);
                    }
                    
                    this.model = gltf.scene;
                    this.scene.add(this.model);
                    
                    // Extract skeleton
                    this.skeleton = null;
                    this.bones = {};
                    
                    this.model.traverse((child) => {
                        if (child.isSkinnedMesh && child.skeleton) {
                            this.skeleton = child.skeleton;
                        }
                    });
                    
                    if (this.skeleton) {
                        // Build bone map
                        this.skeleton.bones.forEach(bone => {
                            this.bones[bone.name] = bone;
                        });
                    }
                    
                    // Center model
                    const box = new THREE.Box3().setFromObject(this.model);
                    const center = box.getCenter(new THREE.Vector3());
                    this.model.position.sub(center);
                    
                    // Adjust camera
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    this.camera.position.set(0, maxDim * 0.6, maxDim * 1.5);
                    this.controls.target.set(0, maxDim * 0.3, 0);
                    this.controls.update();
                    
                    URL.revokeObjectURL(url);
                    resolve({
                        hasSkeleton: !!this.skeleton,
                        boneCount: this.skeleton ? this.skeleton.bones.length : 0,
                        boneNames: Object.keys(this.bones)
                    });
                },
                undefined,
                (error) => {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            );
        });
    }
    
    setBoneRotation(boneName, axis, degrees) {
        const bone = this.bones[boneName];
        if (!bone) return;
        
        const radians = (degrees * Math.PI) / 180;
        const axisIndex = { 'x': 0, 'y': 1, 'z': 2 }[axis.toLowerCase()];
        
        if (axisIndex !== undefined) {
            bone.rotation[['x', 'y', 'z'][axisIndex]] = radians;
        }
    }
    
    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    resize(width, height) {
        if (this.camera && this.renderer) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }
    
    captureImage(width, height, bgColor = null) {
        if (!this.renderer || !this.THREE) return null;
        
        // Hide grid during capture
        if (this.gridHelper) this.gridHelper.visible = false;
        
        // Store original state
        const oldBg = this.scene.background;
        const oldPixelRatio = this.renderer.getPixelRatio();
        const originalSize = new this.THREE.Vector2();
        this.renderer.getSize(originalSize);
        
        // Override background if specified
        if (bgColor && Array.isArray(bgColor) && bgColor.length === 3) {
            this.scene.background = new this.THREE.Color(
                bgColor[0] / 255,
                bgColor[1] / 255,
                bgColor[2] / 255
            );
        }
        
        let dataURL = null;
        
        try {
            // Render at export resolution
            this.renderer.setPixelRatio(1);
            this.renderer.setSize(width, height, false);
            
            // Render frame
            this.renderer.render(this.scene, this.camera);
            dataURL = this.canvas.toDataURL('image/png');
            
            // Restore
            this.renderer.setPixelRatio(oldPixelRatio);
            this.renderer.setSize(originalSize.x, originalSize.y, true);
            
        } catch (e) {
            console.error('[Boyo GLB] Capture failed:', e);
        } finally {
            // Restore state
            this.scene.background = oldBg;
            if (this.gridHelper) this.gridHelper.visible = true;
            if (this.renderer.getPixelRatio() !== oldPixelRatio) {
                this.renderer.setPixelRatio(oldPixelRatio);
            }
        }
        
        return dataURL;
    }
    
    dispose() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// === Main Widget Class ===
class GLBPoseStudioWidget {
    constructor(node) {
        this.node = node;
        this.container = null;
        this.viewer = null;
        this.currentFile = null;
        this.boneControls = {};
        
        // Pose data
        this.poses = [{ bones: {}, name: "Pose 1" }];
        this.activeTab = 0;
        
        // Export settings
        this.exportParams = {
            view_width: 1024,
            view_height: 1024,
            output_mode: "LIST",
            grid_columns: 2,
            bg_color: [0, 0, 0]
        };
        
        // Lighting settings
        this.lightParams = [
            { type: 'directional', color: '#ffffff', intensity: 2.0, x: 10, y: 20, z: 30 },
            { type: 'ambient', color: '#505050', intensity: 1.0, x: 0, y: 0, z: 0 }
        ];
        
        this.createUI();
    }
    
    createUI() {
        // Inject styles
        if (!document.getElementById('boyo-glb-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'boyo-glb-styles';
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
        }
        
        // Main container
        this.container = document.createElement("div");
        this.container.className = "boyo-glb-studio";
        
        // LEFT PANEL
        const leftPanel = document.createElement("div");
        leftPanel.className = "boyo-glb-left";
        
        // File Section
        const fileSection = this.createSection("GLB Model");
        
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".glb";
        fileInput.className = "boyo-glb-file-input";
        fileInput.addEventListener("change", (e) => this.handleFileSelect(e));
        fileSection.content.appendChild(fileInput);
        
        this.statusDiv = document.createElement("div");
        this.statusDiv.className = "boyo-glb-status";
        this.statusDiv.textContent = "No model loaded";
        fileSection.content.appendChild(this.statusDiv);
        
        leftPanel.appendChild(fileSection.el);
        
        // Bone Controls Section (hidden initially)
        this.boneSection = this.createSection("Bone Rotations");
        this.boneSection.el.style.display = "none";
        leftPanel.appendChild(this.boneSection.el);
        
        // Export Settings Section
        const exportSection = this.createSection("Export Settings");
        
        const dimRow = document.createElement("div");
        dimRow.style.cssText = "display: flex; gap: 8px;";
        dimRow.appendChild(this.createInputField("Width", "view_width", "number", 512, 4096, 64));
        dimRow.appendChild(this.createInputField("Height", "view_height", "number", 512, 4096, 64));
        exportSection.content.appendChild(dimRow);
        
        const captureBtn = document.createElement("button");
        captureBtn.className = "boyo-glb-btn";
        captureBtn.textContent = "Test Capture";
        captureBtn.style.width = "100%";
        captureBtn.style.marginTop = "8px";
        captureBtn.addEventListener("click", () => {
            this.syncToNode();
            console.log('[Boyo GLB] Captured at', this.exportParams.view_width, 'x', this.exportParams.view_height);
        });
        exportSection.content.appendChild(captureBtn);
        
        leftPanel.appendChild(exportSection.el);
        
        // Lighting Section
        const lightSection = this.createSection("Lighting");
        
        const addLightBtn = document.createElement("button");
        addLightBtn.className = "boyo-glb-btn";
        addLightBtn.textContent = "+ Add Light";
        addLightBtn.style.width = "100%";
        addLightBtn.addEventListener("click", () => this.addLight());
        lightSection.content.appendChild(addLightBtn);
        
        this.lightsContainer = document.createElement("div");
        this.lightsContainer.style.cssText = "display: flex; flex-direction: column; gap: 8px; margin-top: 8px;";
        lightSection.content.appendChild(this.lightsContainer);
        
        // Initialize light controls
        this.refreshLightControls();
        
        leftPanel.appendChild(lightSection.el);
        
        this.container.appendChild(leftPanel);
        
        // CENTER PANEL
        const centerPanel = document.createElement("div");
        centerPanel.className = "boyo-glb-center";
        
        this.canvasContainer = document.createElement("div");
        this.canvasContainer.className = "boyo-glb-canvas";
        centerPanel.appendChild(this.canvasContainer);
        
        this.container.appendChild(centerPanel);
        
        // Initialize viewer
        setTimeout(() => this.initViewer(), 100);
    }
    
    createSection(title) {
        const section = document.createElement("div");
        section.className = "boyo-glb-section";
        
        const header = document.createElement("div");
        header.className = "boyo-glb-section-header";
        header.textContent = title;
        section.appendChild(header);
        
        const content = document.createElement("div");
        content.className = "boyo-glb-section-content";
        section.appendChild(content);
        
        // Toggle collapse
        header.addEventListener("click", () => {
            const isHidden = content.style.display === "none";
            content.style.display = isHidden ? "flex" : "none";
        });
        
        return { el: section, header, content };
    }
    
    async initViewer() {
        try {
            this.viewer = new GLBViewer(this.canvasContainer);
            
            // Wait for viewer to be ready
            setTimeout(() => {
                // Apply initial lighting
                this.applyLighting();
                
                // Trigger initial resize
                this.resize();
            }, 100);
            
        } catch (error) {
            console.error("[Boyo GLB] Failed to init viewer:", error);
            this.statusDiv.textContent = "Failed to initialize 3D viewer";
        }
    }
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.statusDiv.textContent = "Loading...";
        this.currentFile = file;
        
        try {
            const result = await this.viewer.loadGLB(file);
            
            this.statusDiv.textContent = result.hasSkeleton 
                ? `Loaded: ${result.boneCount} bones`
                : "Loaded: Static mesh (no skeleton)";
            
            if (result.hasSkeleton) {
                this.createBoneControls(result.boneNames);
            } else {
                this.boneSection.el.style.display = "none";
            }
            
        } catch (error) {
            console.error("[Boyo GLB] Load error:", error);
            this.statusDiv.textContent = "Failed to load GLB";
        }
    }
    
    createBoneControls(boneNames) {
        // Clear existing
        this.boneSection.content.innerHTML = "";
        this.boneControls = {};
        
        if (boneNames.length === 0) {
            this.boneSection.el.style.display = "none";
            return;
        }
        
        this.boneSection.el.style.display = "block";
        
        // Create slider for each bone axis
        boneNames.forEach(boneName => {
            const boneDiv = document.createElement("div");
            boneDiv.style.cssText = "margin-bottom: 12px; padding: 8px; background: #1a1a1a; border-radius: 4px;";
            
            const label = document.createElement("div");
            label.textContent = boneName;
            label.style.cssText = "font-weight: 600; margin-bottom: 6px; color: #e0e0e0;";
            boneDiv.appendChild(label);
            
            ['X', 'Y', 'Z'].forEach(axis => {
                const field = this.createSlider(`${axis}`, boneName, axis, -180, 180, 1, 0);
                boneDiv.appendChild(field);
            });
            
            this.boneSection.content.appendChild(boneDiv);
        });
    }
    
    createSlider(label, boneName, axis, min, max, step, defaultVal) {
        const field = document.createElement("div");
        field.className = "boyo-glb-field";
        
        const labelDiv = document.createElement("div");
        labelDiv.className = "boyo-glb-label";
        labelDiv.textContent = label;
        field.appendChild(labelDiv);
        
        const container = document.createElement("div");
        container.className = "boyo-glb-slider-container";
        
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = defaultVal;
        slider.className = "boyo-glb-slider";
        
        const valueSpan = document.createElement("span");
        valueSpan.className = "boyo-glb-value";
        valueSpan.textContent = `${defaultVal}°`;
        
        slider.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            valueSpan.textContent = `${val.toFixed(0)}°`;
            this.viewer.setBoneRotation(boneName, axis, val);
            
            // Store in current pose
            if (!this.poses[this.activeTab].bones[boneName]) {
                this.poses[this.activeTab].bones[boneName] = { x: 0, y: 0, z: 0 };
            }
            this.poses[this.activeTab].bones[boneName][axis.toLowerCase()] = val;
        });
        
        container.appendChild(slider);
        container.appendChild(valueSpan);
        field.appendChild(container);
        
        return field;
    }
    
    createInputField(label, key, type, min, max, step) {
        const field = document.createElement("div");
        field.className = "boyo-glb-field";
        field.style.flex = "1";
        
        const labelDiv = document.createElement("div");
        labelDiv.className = "boyo-glb-label";
        labelDiv.textContent = label;
        field.appendChild(labelDiv);
        
        const input = document.createElement("input");
        input.type = type;
        input.value = this.exportParams[key];
        input.className = "boyo-glb-file-input";
        input.style.padding = "4px 8px";
        
        if (type === "number") {
            input.min = min;
            input.max = max;
            input.step = step;
        }
        
        input.addEventListener("change", (e) => {
            this.exportParams[key] = type === "number" ? parseInt(e.target.value) : e.target.value;
        });
        
        field.appendChild(input);
        return field;
    }
    
    addLight() {
        this.lightParams.push({
            type: 'directional',
            color: '#ffffff',
            intensity: 1.0,
            x: 0,
            y: 10,
            z: 0
        });
        this.refreshLightControls();
        this.applyLighting();
    }
    
    refreshLightControls() {
        if (!this.lightsContainer) return;
        
        this.lightsContainer.innerHTML = "";
        
        this.lightParams.forEach((light, idx) => {
            const lightDiv = document.createElement("div");
            lightDiv.style.cssText = "background: #1a1a1a; padding: 8px; border-radius: 4px; margin-bottom: 8px;";
            
            // Header
            const header = document.createElement("div");
            header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;";
            
            const title = document.createElement("div");
            title.style.cssText = "font-weight: 600; color: #e0e0e0;";
            title.textContent = `Light ${idx + 1}`;
            header.appendChild(title);
            
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "×";
            deleteBtn.style.cssText = "background: #d32f2f; color: white; border: none; border-radius: 3px; padding: 2px 8px; cursor: pointer; font-size: 16px;";
            deleteBtn.addEventListener("click", () => {
                this.lightParams.splice(idx, 1);
                this.refreshLightControls();
                this.applyLighting();
            });
            header.appendChild(deleteBtn);
            
            lightDiv.appendChild(header);
            
            // Type selector
            const typeSelect = document.createElement("select");
            typeSelect.className = "boyo-glb-file-input";
            typeSelect.style.marginBottom = "6px";
            ['ambient', 'directional', 'point'].forEach(t => {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
                if (t === light.type) opt.selected = true;
                typeSelect.appendChild(opt);
            });
            typeSelect.addEventListener("change", (e) => {
                light.type = e.target.value;
                this.applyLighting();
            });
            lightDiv.appendChild(typeSelect);
            
            // Color
            const colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.value = light.color;
            colorInput.className = "boyo-glb-file-input";
            colorInput.style.height = "30px";
            colorInput.addEventListener("change", (e) => {
                light.color = e.target.value;
                this.applyLighting();
            });
            lightDiv.appendChild(colorInput);
            
            // Intensity slider
            const intensityField = this.createLightSlider("Intensity", light, "intensity", 0, 3, 0.1);
            lightDiv.appendChild(intensityField);
            
            // Position sliders (if not ambient)
            if (light.type !== 'ambient') {
                ['x', 'y', 'z'].forEach(axis => {
                    const field = this.createLightSlider(axis.toUpperCase(), light, axis, -50, 50, 1);
                    lightDiv.appendChild(field);
                });
            }
            
            this.lightsContainer.appendChild(lightDiv);
        });
    }
    
    createLightSlider(label, light, key, min, max, step) {
        const field = document.createElement("div");
        field.className = "boyo-glb-field";
        field.style.marginTop = "4px";
        
        const labelDiv = document.createElement("div");
        labelDiv.className = "boyo-glb-label";
        labelDiv.textContent = label;
        field.appendChild(labelDiv);
        
        const container = document.createElement("div");
        container.className = "boyo-glb-slider-container";
        
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = light[key];
        slider.className = "boyo-glb-slider";
        
        const valueSpan = document.createElement("span");
        valueSpan.className = "boyo-glb-value";
        valueSpan.textContent = light[key].toFixed(1);
        
        slider.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            light[key] = val;
            valueSpan.textContent = val.toFixed(1);
            this.applyLighting();
        });
        
        container.appendChild(slider);
        container.appendChild(valueSpan);
        field.appendChild(container);
        
        return field;
    }
    
    applyLighting() {
        if (this.viewer) {
            this.viewer.updateLights(this.lightParams);
        }
    }
    
    resize() {
        if (this.viewer && this.canvasContainer) {
            const rect = this.canvasContainer.getBoundingClientRect();
            const targetW = Math.round(rect.width);
            const targetH = Math.round(rect.height);
            
            if (targetW > 1 && targetH > 1) {
                const dw = Math.abs(targetW - (this._lastResizeW || 0));
                const dh = Math.abs(targetH - (this._lastResizeH || 0));
                if (dw < 2 && dh < 2) return;
                
                this._lastResizeW = targetW;
                this._lastResizeH = targetH;
                this.viewer.resize(targetW, targetH);
            }
        }
    }
    
    syncToNode() {
        // Capture at EXPORT resolution, not viewport size
        const width = this.exportParams.view_width || 1024;
        const height = this.exportParams.view_height || 1024;
        const bgColor = this.exportParams.bg_color;
        
        const image = this.viewer ? this.viewer.captureImage(width, height, bgColor) : null;
        
        // Generate lighting prompt
        const lightingPrompt = this.generateLightingPrompt();
        
        const data = {
            poses: this.poses,
            export: this.exportParams,
            lights: this.lightParams,
            captured_images: image ? [image] : [],
            lighting_prompts: [lightingPrompt],
            glb_filename: this.currentFile ? this.currentFile.name : null
        };
        
        // Update pose_data widget
        const widget = this.node.widgets.find(w => w.name === "pose_data");
        if (widget) {
            widget.value = JSON.stringify(data);
        }
    }
    
    generateLightingPrompt() {
        if (!this.lightParams || this.lightParams.length === 0) {
            return "studio lighting";
        }
        
        const parts = [];
        
        this.lightParams.forEach(light => {
            if (light.type === 'ambient') {
                parts.push(`ambient ${this.getColorName(light.color)} light`);
            } else if (light.type === 'directional') {
                parts.push(`directional ${this.getColorName(light.color)} light from above`);
            } else if (light.type === 'point') {
                parts.push(`${this.getColorName(light.color)} point light`);
            }
        });
        
        return parts.join(", ") || "studio lighting";
    }
    
    getColorName(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Simple color naming
        if (r > 200 && g > 200 && b > 200) return "white";
        if (r > 200 && g < 100 && b < 100) return "red";
        if (r < 100 && g > 200 && b < 100) return "green";
        if (r < 100 && g < 100 && b > 200) return "blue";
        if (r > 200 && g > 200 && b < 100) return "yellow";
        if (r > 200 && g < 100 && b > 200) return "magenta";
        if (r < 100 && g > 200 && b > 200) return "cyan";
        if (r > 150 && g > 100 && b < 100) return "orange";
        return "neutral";
    }
}

// === ComfyUI Extension Registration ===
app.registerExtension({
    name: "Boyo.GLBPoseStudio",
    
    async beforeRegisterNodeDef(nodeType, nodeData, _app) {
        if (nodeData.name !== "Boyo_GLB_PoseStudio") return;
        
        const onCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (onCreated) onCreated.apply(this, arguments);
            
            this.setSize([900, 740]);
            
            // Create widget
            this.glbWidget = new GLBPoseStudioWidget(this);
            
            this.addDOMWidget("glb_studio_ui", "ui", this.glbWidget.container, {
                serialize: false,
                hideOnZoom: false
            });
            
            // Hide pose_data widget
            const poseWidget = this.widgets?.find(w => w.name === "pose_data");
            if (poseWidget) {
                poseWidget.type = "hidden";
                poseWidget.computeSize = () => [0, -4];
                poseWidget.hidden = true;
                if (poseWidget.element) {
                    poseWidget.element.style.display = "none";
                }
            }
        };
        
        // Handle node resize
        nodeType.prototype.onResize = function (size) {
            if (this.glbWidget) {
                clearTimeout(this.resizeTimer);
                this.resizeTimer = setTimeout(() => {
                    this.glbWidget.resize();
                }, 50);
            }
        };
        
        // Before execution, sync data
        const onExecutionStart = nodeType.prototype.onExecutionStart;
        nodeType.prototype.onExecutionStart = function () {
            if (onExecutionStart) onExecutionStart.apply(this, arguments);
            
            if (this.glbWidget) {
                this.glbWidget.syncToNode();
            }
        };
    }
});
