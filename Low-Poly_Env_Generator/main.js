import * as THREE from "https://esm.run/three@0.160.0";
import { OrbitControls } from "https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "https://esm.run/simplex-noise@4.0.1";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);
scene.fog = new THREE.Fog(0x101010, 20, 80);

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
const heightMult = 1.8;
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

// Terrain geometry
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
const pos = terrainGeo.attributes.position;

for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h = fbmNoise(x, y) * heightMult;

    // add small secondary noise for subtle bumps
    pos.setZ(i, h + noise2D(x*0.5, y*0.5)*0.2);
}

const colors = [];
for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const c = new THREE.Color();
    if (z > 0.5) c.set(0x88cc88);
    else if (z < -0.5) c.set(0x446644);
    else c.set(0x66bb66);
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

function getHeightAt(x, z) {
    return fbmNoise(x, z) * heightMult + noise2D(x*0.5, z*0.5)*0.2;
}

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

// Trees (temporary)
function createTree() {
    const tree = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.3;
    trunk.castShadow = true;
    tree.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(0.5, 1.2, 6);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, flatShading: true });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 1.1;
    leaves.castShadow = true;
    tree.add(leaves);

    const s = 0.8 + Math.random()*0.4;
    tree.scale.setScalar(s);

    // random rotation
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
}

// Rocks (temporary)
function createRock() {
    const geo = new THREE.IcosahedronGeometry(0.4, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true });
    const rock = new THREE.Mesh(geo, mat);
    rock.castShadow = true;

    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.scale.setScalar(0.3 + Math.random()*0.7);

    return rock;
}

// Scatter objects
function scatterTrees(count=40) {
    for (let i=0; i<count; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;
        const tree = createTree();
        placeObjectOnTerrain(tree, x, z);
        scene.add(tree);
    }
}

function scatterRocks(count=25) {
    for (let i=0; i<count; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;
        const rock = createRock();
        placeObjectOnTerrain(rock, x, z);
        scene.add(rock);
    }
}

scatterTrees();
scatterRocks();

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 7);
dir.castShadow = true;
scene.add(dir);

// Water
const waterLevel = -0.6;
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

// Camera
camera.position.set(6, 5, 6);
camera.lookAt(0, 0, 0);

// Animation
function animate() {
    requestAnimationFrame(animate);
    updateWater();
    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
