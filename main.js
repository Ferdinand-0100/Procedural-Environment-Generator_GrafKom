import * as THREE from "https://esm.run/three@0.160.0";
import { OrbitControls } from "https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "https://esm.run/simplex-noise@4.0.1";

// Local Storage
function loadSettings() {
    const generated = localStorage.getItem('terrainGenerated');
    return {
        generated: generated === 'true',
        segments: parseInt(localStorage.getItem('terrainSegments')) || 60,
        heightMult: parseFloat(localStorage.getItem('terrainHeight')) || 1.8,
        treeDensity: parseInt(localStorage.getItem('treeDensity')) || 40
    };
}

function saveSettings(segments, heightMult, treeDensity) {
    localStorage.setItem('terrainGenerated', 'true');
    localStorage.setItem('terrainSegments', segments);
    localStorage.setItem('terrainHeight', heightMult);
    localStorage.setItem('treeDensity', treeDensity);
}

function resetSettings() {
    localStorage.clear();
}

function showLoading(show = true) {
    document.getElementById('loadingOverlay').style.visibility = show ? 'visible' : 'hidden';
}

// Load settings
const settings = loadSettings();

// UI
const generationPanel = document.getElementById('generationPanel');
const controlPanel = document.getElementById('controlPanel');
const hint = document.getElementById('hint');

const lodInput = document.getElementById('lodInput');
const heightInput = document.getElementById('heightInput');
const heightValue = document.getElementById('heightValue');
const treeDensityInput = document.getElementById('treeDensityInput');
const treeDensityValue = document.getElementById('treeDensityValue');
const generateButton = document.getElementById('generateButton');
const resetButton = document.getElementById('resetButton');
const regenerateButton = document.getElementById('regenerateButton');

// Set initial values
lodInput.value = settings.segments;
heightInput.value = settings.heightMult;
heightValue.textContent = settings.heightMult;
treeDensityInput.value = settings.treeDensity;
treeDensityValue.textContent = settings.treeDensity;

// Update display values
heightInput.addEventListener('input', () => {
    heightValue.textContent = heightInput.value;
});

treeDensityInput.addEventListener('input', () => {
    treeDensityValue.textContent = treeDensityInput.value;
});

// Settings Panel
if (settings.generated) {
    generationPanel.style.display = 'none';
    controlPanel.style.display = 'block';
    hint.style.display = 'block';
    initScene();
} else {
    generationPanel.style.display = 'block';
    controlPanel.style.display = 'none';
}

// Generate button
generateButton.addEventListener('click', () => {
    const segments = parseInt(lodInput.value);
    const height = parseFloat(heightInput.value);
    const density = parseInt(treeDensityInput.value);
    
    saveSettings(segments, height, density);
    showLoading(true);
    
    setTimeout(() => {
        location.reload();
    }, 100);
});

// Reset button
resetButton.addEventListener('click', () => {
    resetSettings();
    lodInput.value = 60;
    heightInput.value = 1.8;
    heightValue.textContent = '1.8';
    treeDensityInput.value = 40;
    treeDensityValue.textContent = '40';
});

// Regenerate button
regenerateButton.addEventListener('click', () => {
    resetSettings();
    showLoading(true);
    setTimeout(() => location.reload(), 100);
});

// Scene Initialization
function initScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 20, 80);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 8, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Parameters
    const terrainSize = 50;
    const segments = settings.segments;
    const heightMult = settings.heightMult;
    const treeDensity = settings.treeDensity;
    const noise2D = createNoise2D();

    // Noise
    function fbmNoise(x, y) {
        let total = 0;
        let amplitude = 1;
        let frequency = 0.08;

        for (let i = 0; i < 4; i++) {
            total += noise2D(x * frequency, y * frequency) * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return total;
    }

    // Sky
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Terrain
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    const pos = terrainGeo.attributes.position;

    // Generate extreme peaks
    const numExtremePeaks = 3;
    const extremePeaks = [];
    for (let i = 0; i < numExtremePeaks; i++) {
        extremePeaks.push({
            x: (Math.random() - 0.5) * terrainSize,
            z: (Math.random() - 0.5) * terrainSize,
            height: 8 + Math.random() * 6,
            radius: 4 + Math.random() * 3
        });
    }

    // Apply height to terrain
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        let h = fbmNoise(x, y) * heightMult;

        // Add extreme mountains
        extremePeaks.forEach(peak => {
            const dx = x - peak.x;
            const dz = y - peak.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < peak.radius) {
                const influence = 1 - dist / peak.radius;
                h += peak.height * influence * (0.5 + 0.5 * noise2D(x*0.3, y*0.3));
            }
        });

        pos.setZ(i, h);
    }

    // Biome
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const c = new THREE.Color();

        if (z < -0.3) {
            // Beach biome
            c.set(0xf4e4c1);
        } else if (z < 0.5) {
            // Low grass
            c.set(0x66bb66);
        } else if (z < 2.0) {
            // High grass
            c.set(0x88cc88);
        } else {
            // Snow biome
            c.set(0xffffff);
        }

        colors.push(c.r, c.g, c.b);
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
    terrainGeo.rotateX(-Math.PI / 2);

    const terrainMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 1.0
    });

    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Raycast for Props Placement
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    function placeObjectOnTerrain(obj, x, z) {
        raycaster.set(new THREE.Vector3(x, 50, z), down);
        const hits = raycaster.intersectObject(terrain);
        if (hits.length > 0) {
            obj.position.copy(hits[0].point);
            obj.rotation.y = Math.random() * Math.PI * 2;
            return true;
        }
        return false;
    }

    function getRaycastHeight(x, z) {
        raycaster.set(new THREE.Vector3(x, 50, z), down);
        const hits = raycaster.intersectObject(terrain);
        return hits.length > 0 ? hits[0].point.y : null;
    }

    // Trees
    function createTree() {
        const tree = new THREE.Group();

        const trunkHeight = 0.5 + Math.random() * 0.5;
        const trunkGeo = new THREE.CylinderGeometry(0.08, 0.1, trunkHeight, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(0.08, 0.6, 0.35), 
            flatShading: true 
        });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight/2;
        trunk.castShadow = true;
        tree.add(trunk);

        const numCones = 1 + Math.floor(Math.random()*2);
        for (let i=0; i<numCones; i++) {
            const coneHeight = 0.8 + Math.random() * 0.4;
            const coneRadius = 0.4 + Math.random() * 0.2;
            const leavesGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 6);
            const leavesMat = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(0.33, 0.6, 0.35), 
                flatShading: true 
            });
            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y = trunkHeight + coneHeight/2 - i*0.2;
            leaves.castShadow = true;
            tree.add(leaves);
        }

        tree.scale.setScalar(0.7 + Math.random() * 0.6);
        return tree;
    }

    // Rocks
    function createRock() {
        const geoTypes = [
            new THREE.IcosahedronGeometry(0.3 + Math.random()*0.4, 0),
            new THREE.BoxGeometry(0.4, 0.3, 0.4)
        ];
        const geo = geoTypes[Math.floor(Math.random() * geoTypes.length)];
        const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(0, 0, 0.4 + Math.random()*0.2), 
            flatShading: true 
        }));
        rock.castShadow = true;
        rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        rock.scale.setScalar(0.4 + Math.random() * 0.6);
        return rock;
    }

    // Object Scattering
    function scatterTrees(count, minH, maxH) {
        let placed = 0;
        let attempts = 0;
        while (placed < count && attempts < count * 3) {
            const x = (Math.random() - 0.5) * terrainSize;
            const z = (Math.random() - 0.5) * terrainSize;
            const h = getRaycastHeight(x, z);
            
            if (h !== null && h >= minH && h <= maxH) {
                const tree = createTree();
                if (placeObjectOnTerrain(tree, x, z)) {
                    scene.add(tree);
                    placed++;
                }
            }
            attempts++;
        }
    }

    function scatterRocks(count, minH, maxH) {
        let placed = 0;
        let attempts = 0;
        while (placed < count && attempts < count * 3) {
            const x = (Math.random() - 0.5) * terrainSize;
            const z = (Math.random() - 0.5) * terrainSize;
            const h = getRaycastHeight(x, z);
            
            if (h !== null && h >= minH && h <= maxH) {
                const rock = createRock();
                if (placeObjectOnTerrain(rock, x, z)) {
                    scene.add(rock);
                    placed++;
                }
            }
            attempts++;
        }
    }

    scatterTrees(treeDensity, -0.2, 2.5);
    scatterRocks(Math.floor(treeDensity * 0.5), 0, 4);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 10, 7);
    dir.castShadow = true;
    scene.add(dir);

    // Water
    let waterLevel = -0.6;
    const waterGeo = new THREE.PlaneGeometry(terrainSize, terrainSize);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1e90ff,
        flatShading: true,
        transparent: true,
        opacity: 0.6
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = waterLevel;
    scene.add(water);

    const waterClock = new THREE.Clock();
    function updateWater() {
        const t = waterClock.getElapsedTime();
        water.position.y = waterLevel + Math.sin(t * 0.5) * 0.05;
    }

    // Clouds
    const clouds = [];
    const maxClouds = 10;

    function createCloud(x, y, z, scale = 1) {
        const cloud = new THREE.Group();
        const numCubes = 5 + Math.floor(Math.random() * 5);

        for (let i = 0; i < numCubes; i++) {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
            const cube = new THREE.Mesh(geo, mat);
            cube.position.set(
                (Math.random() - 0.5) * 2.5,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 2.5
            );
            cube.scale.setScalar(0.5 + Math.random() * 0.6);
            cloud.add(cube);
        }

        cloud.position.set(x, y, z);
        cloud.scale.setScalar(scale);
        cloud.userData = { speed: 0.4 + Math.random() * 0.4 };
        scene.add(cloud);
        clouds.push(cloud);
        return cloud;
    }

    function updateClouds(delta) {
        for (let i = clouds.length - 1; i >= 0; i--) {
            clouds[i].position.x += clouds[i].userData.speed * delta;
            if (clouds[i].position.x > terrainSize/2 + 5) {
                scene.remove(clouds[i]);
                clouds.splice(i, 1);
            }
        }

        while (clouds.length < maxClouds) {
            createCloud(
                -terrainSize/2 - 5,
                12 + Math.random() * 8,
                (Math.random() - 0.5) * terrainSize * 0.7,
                1 + Math.random() * 1.5
            );
        }
    }

    // Initialize clouds
    for (let i = 0; i < 8; i++) {
        createCloud(
            (Math.random() - 0.5) * terrainSize,
            12 + Math.random() * 8,
            (Math.random() - 0.5) * terrainSize * 0.7,
            1 + Math.random() * 1.5
        );
    }

    // Weather System
    let particles;
    let weatherType = 'none';
    const originalColors = terrainGeo.attributes.color.array.slice();

    function createParticles(type) {
        if (particles) {
            scene.remove(particles);
            particles.geometry.dispose();
            particles.material.dispose();
        }

        const count = type === 'snow' ? 1200 : 1000;
        const particleGeo = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < count; i++) {
            positions.push(
                (Math.random() - 0.5) * terrainSize * 2,
                Math.random() * 20 + 5,
                (Math.random() - 0.5) * terrainSize * 2
            );
        }

        particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: type === 'snow' ? 0xffffff : 0x88ccff,
            size: type === 'snow' ? 0.2 : 0.1
        });

        particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);
    }

    function updateParticles(delta) {
        if (!particles || weatherType === 'none') return;

        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            if (weatherType === 'rain') {
                positions[i + 1] -= 20 * delta;
            } else if (weatherType === 'snow') {
                positions[i + 1] -= 5 * delta;
                positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.01;
            }

            if (positions[i + 1] < 0) {
                positions[i + 1] = 20 + Math.random() * 5;
                positions[i] = (Math.random() - 0.5) * terrainSize * 2;
                positions[i + 2] = (Math.random() - 0.5) * terrainSize * 2;
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }

    let snowLevel = 0.8;
    
    // Audio
    let audio = new Audio();
    audio.loop = true;
    audio.volume = 0.4;
    let audioEnabled = false;
    
    // Enable audio on first user interaction
    function enableAudio() {
        if (!audioEnabled) {
            audioEnabled = true;
            console.log("Audio enabled");
        }
    }
    
    function setWeatherSound(type) {
        if (!audioEnabled) {
            console.log("Audio not enabled yet. User must interact first.");
            return;
        }
    
        if (type === "rain") {
            audio.src = "assets/rain.mp3";
            audio.volume = 0.2;
            audio.play().catch(err => {
                console.log("Audio play error:", err);
            });
        } else if (type === "snow") {
            audio.src = "assets/snow.mp3";
            audio.volume = 1.0;
            audio.play().catch(err => {
                console.log("Audio play error:", err);
            });
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    function applySnowOverlay() {
        const colorAttr = terrainGeo.attributes.color;
        for (let i = 0; i < colorAttr.count; i++) {
            const h = pos.getY(i);
            let baseColor = new THREE.Color(0x66bb66);

            if (h < -0.3) {
                baseColor.set(0xf4e4c1); // beach
            } else if (h < 0.5) {
                baseColor.set(0x66bb66); // grass
            } else if (h < 2.0) {
                baseColor.set(0x88cc88); // high grass
            } else {
                baseColor.set(0xffffff); // snow
            }

            const snowBase = 0.2;
            const snowAmount = THREE.MathUtils.clamp((h - snowBase) / Math.max(0.0001, snowLevel - snowBase), 0, 1);
            baseColor.lerp(new THREE.Color(0xffffff), snowAmount);

            colorAttr.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
        }
        colorAttr.needsUpdate = true;
    }

    function setWeather(type) {
        weatherType = type;

        if (particles) {
            scene.remove(particles);
            particles.geometry.dispose();
            particles.material.dispose();
            particles = null;
        }

        if (type === 'none') {
            sky.material.color.set(0x87ceeb);
            scene.fog.color.set(0x87ceeb);
            terrainGeo.attributes.color.array.set(originalColors);
            terrainGeo.attributes.color.needsUpdate = true;
        } else if (type === 'rain') {
            createParticles('rain');
            sky.material.color.set(0x555577);
            scene.fog.color.set(0x555577);
            terrainGeo.attributes.color.array.set(originalColors);
            terrainGeo.attributes.color.needsUpdate = true;
        } else if (type === 'snow') {
            createParticles('snow');
            sky.material.color.set(0xbbccdd);
            scene.fog.color.set(0xbbccdd);
            applySnowOverlay();
        }
        setWeatherSound(type);
    }

    const weatherSelect = document.getElementById('weatherSelect');
    weatherSelect.addEventListener('change', (e) => {
        enableAudio(); // Enable audio on first interaction
        setWeather(e.target.value);
    });

    const waterSlider = document.getElementById('waterSlider');
    waterSlider.addEventListener('input', () => {
        waterLevel = parseFloat(waterSlider.value);
    });

    const snowSlider = document.getElementById('snowSlider');
    snowSlider.addEventListener('input', () => {
        snowLevel = parseFloat(snowSlider.value);
        if (weatherType === 'snow') applySnowOverlay();
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = Math.min(clock.getDelta(), 0.1);

        updateWater();
        updateParticles(delta);
        updateClouds(delta);
        controls.update();

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
