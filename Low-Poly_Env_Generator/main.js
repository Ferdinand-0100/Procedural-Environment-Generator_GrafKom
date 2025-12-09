import * as THREE from "https://esm.run/three@0.160.0";
import { OrbitControls } from "https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "https://esm.run/simplex-noise@4.0.1";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const terrainSize = 50;
const segments = 60;

const noise2D = createNoise2D();
const scale = 0.05;
const heightMult = 1.3;

const terrainGeo = new THREE.PlaneGeometry(
    terrainSize,
    terrainSize,
    segments,
    segments
);

const pos = terrainGeo.attributes.position;

const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

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

function placeObjectOnTerrain(obj, x, z) {
    // start high above terrain
    raycaster.set(new THREE.Vector3(x, 50, z), down);

    const hits = raycaster.intersectObject(terrain);

    if (hits.length > 0) {
        const p = hits[0].point;
        obj.position.copy(p);
    }
}

for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h = fbmNoise(x, y) * heightMult;
    pos.setZ(i, h);
}

pos.needsUpdate = true;
terrainGeo.computeVertexNormals();
terrainGeo.rotateX(-Math.PI / 2);

const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x66bb66,
    flatShading: true,
    roughness: 1.0
});

const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

function getHeightAt(x, y) {
    return noise2D(x * scale, y * scale) * heightMult;
}

function createTree() {
    const tree = new THREE.Group();

    // trunk
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 5);
    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        flatShading: true
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.3;
    tree.add(trunk);

    // leaves
    const leavesGeo = new THREE.ConeGeometry(0.5, 1.2, 6);
    const leavesMat = new THREE.MeshStandardMaterial({
        color: 0x2e8b57,
        flatShading: true
    });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 1.1;
    tree.add(leaves);

    return tree;
}

function createRock() {
    const geo = new THREE.IcosahedronGeometry(0.4, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        flatShading: true
    });
    const rock = new THREE.Mesh(geo, mat);

    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.scale.setScalar(0.4 + Math.random() * 0.6);

    return rock;
}

function scatterTrees(count = 40) {
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;

        const tree = createTree();
        
        placeObjectOnTerrain(tree, x, z);

        tree.rotation.y = Math.random() * Math.PI * 2;

        scene.add(tree);
    }
}

function scatterRocks(count = 25) {
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * terrainSize;
        const z = (Math.random() - 0.5) * terrainSize;

        const rock = createRock();

        placeObjectOnTerrain(rock, x, z);

        scene.add(rock);
    }
}

scatterTrees();
scatterRocks();

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 10, 7);
scene.add(dir);

camera.position.set(6, 5, 6);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});