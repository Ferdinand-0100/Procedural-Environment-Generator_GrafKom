import * as THREE from "https://esm.run/three@0.160.0";
import { OrbitControls } from "https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "https://esm.run/simplex-noise@4.0.1";

function showLoading(show = true) {
    const overlay = document.getElementById("loadingOverlay");
    overlay.style.visibility = show ? "visible" : "hidden";
}

const generateBtn = document.getElementById("generateBtn");
generateBtn.addEventListener("click", () => {
    showLoading(true);
    // Small timeout so the overlay shows before reload
    setTimeout(() => {
        location.reload();
    }, 100);
});

// Scene setup
const scene = new THREE.Scene();

// scene.background = new THREE.Color(0x101010);

scene.fog = new THREE.Fog(0x87ceeb, 20, 80);


const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// Terrain parameters
const terrainSize = 50;
const segments = 60; // number of vertices along width/height
let heightMult = 1.8;
const noiseScale = 0.05;
const noise2D = createNoise2D();

// FBM noise
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
const skyMat = new THREE.MeshBasicMaterial({
    color: 0x87ceeb,
    side: THREE.BackSide // camera is inside
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Terrain geometry
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
const pos = terrainGeo.attributes.position;

const numExtremePeaks = 3;

const extremePeaks = [];
for (let i = 0; i < numExtremePeaks; i++) {
    extremePeaks.push({
        x: (Math.random() - 0.5) * terrainSize,
        z: (Math.random() - 0.5) * terrainSize,
        height: 6 + Math.random() * 6,
        radius: 4 + Math.random() * 3
    });
};


for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let h = fbmNoise(x, y) * heightMult;

    // Apply extreme mountains
    extremePeaks.forEach(peak => {
        const dx = x - peak.x;
        const dz = y - peak.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < peak.radius) {
            const influence = 1 - dist / peak.radius;
            h += peak.height * influence * (0.5 + 0.5 * noise2D(x*0.3, y*0.3));
        }
    });

    // small secondary bumps
    /*let baseHeight = fbmNoise(x, y) * heightMult;
    const bump = noise2D(x*0.5, y*0.5) * 0.2 * Math.max(0, baseHeight + 0.5);
    h = baseHeight + bump;*/

    pos.setZ(i, h);
}

let snowLevel = .8;
const colors = [];

for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i); // height
    const c = new THREE.Color();

    if (z > 0.5) {
        c.set(0x88cc88); // high grass
    } else if (z < -0.5) {
        c.set(0x446644); // shadowed grass
    } else {
        c.set(0x66bb66); // normal grass
    }

    colors.push(c.r, c.g, c.b);
}

terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

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

const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

function placeObjectOnTerrain(obj, x, z) {
    raycaster.set(new THREE.Vector3(x, 50, z), down);

    const hits = raycaster.intersectObject(terrain);
    if (hits.length > 0) {
        const p = hits[0].point;
        obj.position.copy(p);

        obj.rotation.x = (Math.random() - 0.5) * 0.2;
        obj.rotation.z = (Math.random() - 0.5) * 0.2;

        obj.rotation.y = Math.random() * Math.PI * 2;
    }
}

// Trees
function createTree() {
    const tree = new THREE.Group();

    // Trunk variation
    const trunkRadiusTop = 0.08 + Math.random() * 0.05;
    const trunkRadiusBottom = 0.08 + Math.random() * 0.05;
    const trunkHeight = 0.5 + Math.random() * 0.5;
    const trunkGeo = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(0.08, 0.6, 0.35 + Math.random()*0.1), 
        flatShading: true 
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight/2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Leaves variation
    const numLeavesCones = 1 + Math.floor(Math.random()*3);
    for (let i=0; i<numLeavesCones; i++) {
        const coneHeight = 0.8 + Math.random() * 0.5;
        const coneRadius = 0.4 + Math.random() * 0.3;
        const leavesGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 6);
        const leavesMat = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(0.33 + Math.random()*0.1, 0.6, 0.3 + Math.random()*0.1), 
            flatShading: true 
        });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = trunkHeight + coneHeight/2 - i*0.2;
        leaves.castShadow = true;
        tree.add(leaves);
    }

    const scale = 0.7 + Math.random() * 0.6;
    tree.scale.setScalar(scale);

    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
}

// Rocks
function createRock() {
    // Choose random rock geometry
    const geoTypes = [
        new THREE.IcosahedronGeometry(0.3 + Math.random()*0.5, 0),
        new THREE.BoxGeometry(0.3 + Math.random()*0.5, 0.2 + Math.random()*0.3, 0.3 + Math.random()*0.5),
        new THREE.CylinderGeometry(0.2 + Math.random()*0.4, 0.2 + Math.random()*0.4, 0.2 + Math.random()*0.4, 6)
    ];
    const geo = geoTypes[Math.floor(Math.random() * geoTypes.length)];

    const rock = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(0.1 + Math.random()*0.05, 0, 0.4 + Math.random()*0.2), 
            flatShading: true 
        })
    );
    rock.castShadow = true;

    rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    const s = 0.3 + Math.random() * 0.7;
    rock.scale.setScalar(s);

    return rock;
}

// Raycast to help props distribution
function getRaycastHeight(x, z) {
    raycaster.set(new THREE.Vector3(x, 50, z), down);
    const hits = raycaster.intersectObject(terrain);
    if (hits.length > 0) {
        return hits[0].point.y;
    }
    return null; // outside terrain
}

// Scatter objects
function scatterTrees(count = 40, minHeight = 0, maxHeight = 3) {
    let placed = 0;
    while (placed < count) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;

        const h = getRaycastHeight(x, z);
        if (h === null || h < minHeight || h > maxHeight) continue; // retry if invalid

        const tree = createTree();
        placeObjectOnTerrain(tree, x, z);
        scene.add(tree);
        placed++;
    }
}

function scatterRocks(count = 40, minHeight = 0, maxHeight = 3) {
    let placed = 0;
    while (placed < count) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;

        const h = getRaycastHeight(x, z);
        if (h === null || h < minHeight || h > maxHeight) continue;

        const rock = createRock();
        placeObjectOnTerrain(rock, x, z);
        scene.add(rock);
        placed++;
    }
}

function scatterTreeClusters(numClusters = 3, treesPerCluster = 10, clusterRadius = 3, minHeight = 0, maxHeight = 3) {
    for (let i = 0; i < numClusters; i++) {
        const centerX = (Math.random() - 0.5) * terrainSize;
        const centerZ = (Math.random() - 0.5) * terrainSize;

        for (let j = 0; j < treesPerCluster; j++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * clusterRadius;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;

            const h = getRaycastHeight(x, z);
            if (h === null || h < minHeight || h > maxHeight) continue;

            const tree = createTree();
            placeObjectOnTerrain(tree, x, z);
            scene.add(tree);
        }
    }
}

scatterTreeClusters(10, 8, 2, 0, 4);
scatterTrees();
scatterRocks();

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 7);
dir.castShadow = true;
scene.add(dir);

// Water
let waterLevel = -0.6;
const waterGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 1, 1);
const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1e90ff,
    flatShading: true,
    transparent: true,
    opacity: 0.6,
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI / 2;
water.position.y = waterLevel;
water.receiveShadow = true;
scene.add(water);

const waterClock = new THREE.Clock();
function updateWater() {
    const t = waterClock.getElapsedTime();
    water.position.y = waterLevel + Math.sin(t * 0.5) * 0.05; // subtle up-down
}

// Improved Clouds
const clouds = [];
const maxClouds = 12;

function createCloud(x, y, z, scale = 1) {
    const cloud = new THREE.Group();
    const numCubes = 6 + Math.floor(Math.random() * 6);

    for (let i = 0; i < numCubes; i++) {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
        const cube = new THREE.Mesh(geo, mat);
        cube.position.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 3
        );
        cube.scale.setScalar(0.5 + Math.random() * 0.7);
        cloud.add(cube);
    }

    cloud.position.set(x, y, z);
    cloud.scale.setScalar(scale);
    cloud.userData = { speed: 0.5 + Math.random() * 0.5 };
    scene.add(cloud);
    clouds.push(cloud);
    return cloud;
}

function updateClouds(delta) {
    for (let i = clouds.length - 1; i >= 0; i--) {
        const cloud = clouds[i];
        cloud.position.x += cloud.userData.speed * delta;

        if (cloud.position.x > terrainSize/2 + 5) {
            scene.remove(cloud);
            clouds.splice(i, 1);
        }
    }

    while (clouds.length < maxClouds) {
        const x = -terrainSize/2 - 5;
        const y = 10 + Math.random() * 10;
        const z = (Math.random() - 0.5) * terrainSize * 0.8;
        const scale = 1 + Math.random() * 2;
        createCloud(x, y, z, scale);
    }
}

const numClouds = 8 + Math.floor(Math.random() * 6);

for (let i = 0; i < numClouds; i++) {
    const x = (Math.random() - 0.5) * terrainSize;
    const y = 10 + Math.random() * 10;
    const z = (Math.random() - 0.5) * terrainSize * .8;
    const scale = 1 + Math.random() * 2;
    createCloud(x, y, z, scale);
}

// Particle System for Rain and Snow

let particles;
let particleMaterial;
let particleGeometry;
let weatherType = "none"; // "rain", "snow", "none"

// Original terrain colors
const originalColors = terrainGeo.attributes.color.array.slice();

function createParticles(type) {
    if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
    }

    let count = 850;
    if (type === "rain") count = Math.floor(850 * 1.5);
    if (type === "snow") count = 1200;

    particleGeometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * terrainSize * 2;
        const y = Math.random() * 20 + 5;
        const z = (Math.random() - 0.5) * terrainSize * 2;
        positions.push(x, y, z);
    }

    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    particleMaterial = new THREE.PointsMaterial({
        color: type === "snow" ? 0xffffff : 0x88ccff,
        size: type === "snow" ? 0.2 : 0.1
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
}

function updateParticles(delta) {
    if (!particles || weatherType === "none") return;

    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        if (weatherType === "rain") {
            positions[i + 1] -= 20 * delta;
        } else if (weatherType === "snow") {
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

function updateSkyColor(color) {
    sky.material.color.set(color);
    sky.material.needsUpdate = true;
    scene.fog.color.set(color);
}

function applySnowOverlay() {
    const colorAttr = terrainGeo.attributes.color;

    for (let i = 0; i < colorAttr.count; i++) {
        const h = pos.getY(i);
        const x = pos.getX(i);
        const z = pos.getZ(i);

        let baseColor = new THREE.Color(0x66bb66); // base green

        // snow for weather
        const snowBase = .2;
        const snowAmount = THREE.MathUtils.clamp((h - snowBase) / Math.max(0.0001, snowLevel - snowBase), 0, 1);

        // check extreme peaks
        let peakSnow = 0;
        extremePeaks.forEach(peak => {
            const dx = x - peak.x;
            const dz = z - peak.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < peak.radius) {
                const influence = 1 - dist / peak.radius;
                peakSnow = Math.max(peakSnow, influence); // stronger influence overrides
            }
        });

        // combine weather snow and peak snow
        const finalSnow = Math.max(snowAmount, peakSnow);

        baseColor.lerp(new THREE.Color(0xffffff), finalSnow);

        colorAttr.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
    }

    colorAttr.needsUpdate = true;
}

// Weather sounds
let audio = new Audio();
audio.loop = true;
audio.volume = 0.4;

function setWeatherSound(type) {
    if (type === "rain") {
        audio.src = "assets/rain.mp3";
        audio.volume = 0.2;
        audio.play();
    } else if (type === "snow") {
        audio.src = "assets/snow.mp3";
        audio.volume = 1.0;
        audio.play();
    } else {
        audio.pause();
        audio.currentTime = 0;
    }
}

function setWeather(type) {
    weatherType = type;

    if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
        particles = null;
    }

    if (type === "none") {
        updateSkyColor(0x87ceeb);
        terrainGeo.attributes.color.array.set(originalColors);
        terrainGeo.attributes.color.needsUpdate = true;
    } else if (type === "rain") {
        createParticles("rain");
        updateSkyColor(0x555577);
        terrainGeo.attributes.color.array.set(originalColors);
        terrainGeo.attributes.color.needsUpdate = true;
    } else if (type === "snow") {
        createParticles("snow");
        updateSkyColor(0xbbccdd);
        applySnowOverlay();
    }
    setWeatherSound(type);
}

const weatherSelect = document.getElementById("weatherSelect");
weatherSelect.addEventListener("change", (e) => {
    setWeather(e.target.value);
});

setWeather(weatherSelect.value);

// Camera
camera.position.set(6, 5, 6);
camera.lookAt(0, 0, 0);

// Animation
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    let delta = clock.getDelta();
    delta = Math.min(delta, 0.1);

    updateWater();
    updateParticles(delta);
    updateClouds(delta);

    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Improved UI/UX for Interactivity
const waterSlider = document.getElementById("waterSlider");
const snowSlider = document.getElementById("snowSlider");
const heightSlider = document.getElementById("heightSlider");

// Water level control
waterSlider.addEventListener("input", () => {
    waterLevel = parseFloat(waterSlider.value);
});

// Snow level control
snowSlider.addEventListener("input", () => {
    snowLevel = parseFloat(snowSlider.value);
    if (weatherType === "snow") applySnowOverlay();
});

// Terrain height control
/*
heightSlider.addEventListener("input", () => {
    heightMult = parseFloat(heightSlider.value);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        let h = fbmNoise(x, y) * heightMult;

        extremePeaks.forEach(peak => {
            const dx = x - peak.x;
            const dz = y - peak.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < peak.radius) {
                const influence = 1 - dist / peak.radius;
                h += peak.height * influence * (0.5 + 0.5 * noise2D(x*0.3, y*0.3));
            }
        });

        h += noise2D(x*0.5, y*0.5) * 0.2;
        pos.setZ(i, h);
    }

    terrainGeo.attributes.position.needsUpdate = true;
    terrainGeo.computeVertexNormals();

    if (weatherType === "snow") applySnowOverlay();
});*/