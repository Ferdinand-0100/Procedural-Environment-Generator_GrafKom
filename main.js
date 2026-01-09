import * as THREE from "https://esm.run/three@0.160.0";
import { OrbitControls } from "https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { createNoise2D } from "https://esm.run/simplex-noise@4.0.1";

// Manual 3D Builds
function createRockGeometry() {
    const vertices = [
         0,  1,  0,
        -1, -1,  1,
         1, -1,  1,
         0, -1, -1
    ];

    for (let i = 0; i < vertices.length; i++) {
        vertices[i] += (Math.random() - 0.5) * 0.4;
    }

    const scale = 0.5 + Math.random() * 1.2; // Manual Scalation

    for (let i = 0; i < vertices.length; i++) {
        vertices[i] *= scale;
    }

    const angle = Math.random() * Math.PI * 2; // Manual Rotation
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];

        vertices[i]     = x * cos - z * sin;
        vertices[i + 2] = x * sin + z * cos;
    }

    const indices = [
        0, 1, 2,
        0, 2, 3,
        0, 3, 1,
        1, 3, 2
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
}

function createCylinderGeometry(radiusTop, radiusBottom, height, segments = 6) {
    const vertices = [];
    const indices = [];
    const half = height / 2;

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        vertices.push(
            cos * radiusBottom, -half, sin * radiusBottom,
            cos * radiusTop,     half, sin * radiusTop
        );
    }

    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        indices.push(
            a, a + 1, a + 3,
            a, a + 3, a + 2
        );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
}

function createConeGeometry(radius, height, segments = 6) {
    return createCylinderGeometry(0, radius, height, segments);
}

//Line (Syarat)
function addWorldOutline(scene, size, height, yOffset = -2.0) {
    const half = size / 2;
    const yBottom = yOffset;
    const yTop = height + yOffset;

    const points = [
        -half, yBottom, -half,   half, yBottom, -half,
         half, yBottom, -half,   half, yBottom,  half,
         half, yBottom,  half,  -half, yBottom,  half,
        -half, yBottom,  half,  -half, yBottom, -half,

        -half, yTop, -half,   half, yTop, -half,
         half, yTop, -half,   half, yTop,  half,
         half, yTop,  half,  -half, yTop,  half,
        -half, yTop,  half,  -half, yTop, -half,

        -half, yBottom, -half,  -half, yTop, -half,
         half, yBottom, -half,   half, yTop, -half,
         half, yBottom,  half,   half, yTop,  half,
        -half, yBottom,  half,  -half, yTop,  half
    ];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(points, 3)
    );

    const material = new THREE.LineBasicMaterial({
        color: 0x000000
    });

    const cube = new THREE.LineSegments(geometry, material);
    scene.add(cube);
}

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

    addWorldOutline(scene, terrainSize, 25); //Line

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

    function updateTerrainUniforms() {
        terrainMat.uniforms.uModelMatrix.value.copy(terrain.matrixWorld);
        terrainMat.uniforms.uViewMatrix.value.copy(camera.matrixWorldInverse);
        terrainMat.uniforms.uProjectionMatrix.value.copy(camera.projectionMatrix);
        
        const normalMatrix = new THREE.Matrix3();
        normalMatrix.getNormalMatrix(terrain.matrixWorld);
        terrainMat.uniforms.uNormalMatrix.value.copy(normalMatrix);
        
        terrainMat.uniforms.uCameraPosition.value.copy(camera.position);
    }

    const terrainMat = new THREE.ShaderMaterial({ // Custom Shader 1 (Flat)
        uniforms: {
            uAmbientLight: { value: 0.4 },
            uLightColor: { value: new THREE.Color(0xffffff) },
            uLightPosition: { value: new THREE.Vector3(5, 10, 7) },
            
            // Manual matrices
            uModelMatrix: { value: new THREE.Matrix4() },
            uViewMatrix: { value: new THREE.Matrix4() },
            uProjectionMatrix: { value: new THREE.Matrix4() },
            uNormalMatrix: { value: new THREE.Matrix3() },
            uCameraPosition: { value: new THREE.Vector3() }
        },
        vertexShader: `
            precision highp float;
            
            attribute vec3 color;
            
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat3 uNormalMatrix;
            
            varying vec3 vColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPosition;
            
            void main() {
                // Step 1: Pass vertex color through
                vColor = color;
                
                // Step 2: Transform position from object space to world space
                vec4 worldPos4 = uModelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPos4.xyz;
                vPosition = worldPos4.xyz;
                
                // Step 3: Transform normal from object space to world space
                // Normal matrix is the transpose of the inverse of the upper-left 3x3 of model matrix
                vec3 transformedNormal = uNormalMatrix * normal;
                
                // Step 4: Normalize the transformed normal
                float normalLength = sqrt(
                    transformedNormal.x * transformedNormal.x +
                    transformedNormal.y * transformedNormal.y +
                    transformedNormal.z * transformedNormal.z
                );
                vNormal = transformedNormal / normalLength;
                
                // Step 5: Transform world position to view space
                vec4 viewPos4 = uViewMatrix * worldPos4;
                vec3 viewPos = viewPos4.xyz;
                
                // Step 6: Transform view position to clip space
                vec4 clipPos = uProjectionMatrix * viewPos4;
                
                // Step 7: Output final position
                gl_Position = clipPos;
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform float uAmbientLight;
            uniform vec3 uLightColor;
            uniform vec3 uLightPosition;
            
            varying vec3 vColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec3 vWorldPosition;
            
            void main() {
                // Step 1: Calculate screen-space derivatives for flat shading
                vec3 dPdx = dFdx(vPosition);
                vec3 dPdy = dFdy(vPosition);
                
                // Step 2: Compute cross product manually for flat normal
                vec3 crossProduct;
                crossProduct.x = dPdx.y * dPdy.z - dPdx.z * dPdy.y;
                crossProduct.y = dPdx.z * dPdy.x - dPdx.x * dPdy.z;
                crossProduct.z = dPdx.x * dPdy.y - dPdx.y * dPdy.x;
                
                // Step 3: Normalize the cross product to get flat normal
                float crossLength = sqrt(
                    crossProduct.x * crossProduct.x +
                    crossProduct.y * crossProduct.y +
                    crossProduct.z * crossProduct.z
                );
                vec3 flatNormal = crossProduct / crossLength;
                
                // Step 4: Calculate light direction vector
                vec3 lightDir;
                lightDir.x = uLightPosition.x - vWorldPosition.x;
                lightDir.y = uLightPosition.y - vWorldPosition.y;
                lightDir.z = uLightPosition.z - vWorldPosition.z;
                
                // Step 5: Normalize light direction
                float lightDirLength = sqrt(
                    lightDir.x * lightDir.x +
                    lightDir.y * lightDir.y +
                    lightDir.z * lightDir.z
                );
                vec3 normalizedLightDir = lightDir / lightDirLength;
                
                // Step 6: Calculate dot product for diffuse lighting
                float dotProduct = 
                    flatNormal.x * normalizedLightDir.x +
                    flatNormal.y * normalizedLightDir.y +
                    flatNormal.z * normalizedLightDir.z;
                
                // Step 7: Clamp dot product to positive values
                float diffuse = dotProduct;
                if (diffuse < 0.0) {
                    diffuse = 0.0;
                }
                
                // Step 8: Calculate diffuse contribution
                float diffuseStrength = 0.8;
                float diffuseComponent = diffuse * diffuseStrength;
                
                // Step 9: Combine ambient and diffuse
                float totalLighting = uAmbientLight + diffuseComponent;
                
                // Step 10: Apply light color to lighting
                vec3 lighting;
                lighting.r = uLightColor.r * totalLighting;
                lighting.g = uLightColor.g * totalLighting;
                lighting.b = uLightColor.b * totalLighting;
                
                // Step 11: Multiply vertex color by lighting
                vec3 finalColor;
                finalColor.r = vColor.r * lighting.r;
                finalColor.g = vColor.g * lighting.g;
                finalColor.b = vColor.b * lighting.b;
                
                // Step 12: Output final color with full opacity
                gl_FragColor = vec4(finalColor.r, finalColor.g, finalColor.b, 1.0);
            }
        `,
        side: THREE.DoubleSide
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
        const trunkGeo = createCylinderGeometry(
            0.08,
            0.1,
            trunkHeight,
            5
        );

        const trunkMat = new THREE.ShaderMaterial({ // Custom Shader 3 (Gouraud)
            uniforms: {
                uLightPosition: { value: new THREE.Vector3(5, 10, 7) },
                uLightColor: { value: new THREE.Color(0xffffff) },
                uAmbient: { value: 0.4 },
                uDiffuse: { value: 0.8 },
                uObjectColor: { value: new THREE.Color().setHSL(0.08, 0.6, 0.35) }
            },
            vertexShader: `
                uniform vec3 uLightPosition;
                uniform vec3 uLightColor;
                uniform float uAmbient;
                uniform float uDiffuse;
                uniform vec3 uObjectColor;
                
                varying vec3 vColor;
                
                void main() {
                    vec3 worldNormal = normalize(normalMatrix * normal);
                    
                    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                    
                    vec3 lightDir = normalize(uLightPosition - worldPosition);
                    
                    float diffuse = max(dot(worldNormal, lightDir), 0.0);
                    
                    vec3 lighting = uLightColor * (uAmbient + uDiffuse * diffuse);
                    
                    vColor = uObjectColor * lighting;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                }
            `
        });

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        const numCones = 1 + Math.floor(Math.random() * 2);

        for (let i = 0; i < numCones; i++) {
            const coneHeight = 0.8 + Math.random() * 0.4;
            const coneRadius = 0.4 + Math.random() * 0.2;

            const leavesGeo = createConeGeometry(
                coneRadius,
                coneHeight,
                6
            );

            const leavesMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.33, 0.6, 0.35),
                flatShading: true
            });

            const leaves = new THREE.Mesh(leavesGeo, leavesMat);
            leaves.position.y =
                trunkHeight + (coneHeight / 2) - (i * 0.2);

            leaves.castShadow = true;
            tree.add(leaves);
        }

        tree.scale.setScalar(0.7 + Math.random() * 0.6);
        return tree;
    }

    // Rocks
    function createRock() {
        const geo = createRockGeometry();

        const rockColor = new THREE.Color().setHSL(0, 0, 0.4 + Math.random() * 0.2);

        const rock = new THREE.Mesh(
            geo,
            new THREE.ShaderMaterial({ // Custom Shader 4 (Phong)
                uniforms: {
                    uLightPosition: { value: new THREE.Vector3(5, 10, 7) },
                    uLightColor: { value: new THREE.Color(0xffffff) },
                    uCameraPosition: { value: new THREE.Vector3() },
                    uAmbient: { value: 0.4 },
                    uDiffuse: { value: 0.8 },
                    uSpecular: { value: 0.3 },
                    uShininess: { value: 30.0 },
                    uObjectColor: { value: rockColor }
                },
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        
                        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uLightPosition;
                    uniform vec3 uLightColor;
                    uniform vec3 uCameraPosition;
                    uniform float uAmbient;
                    uniform float uDiffuse;
                    uniform float uSpecular;
                    uniform float uShininess;
                    uniform vec3 uObjectColor;
                    
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        vec3 normal = normalize(vNormal);
                        
                        vec3 lightDir = normalize(uLightPosition - vPosition);
                        
                        float diffuse = max(dot(normal, lightDir), 0.0);
                        
                        vec3 viewDir = normalize(uCameraPosition - vPosition);
                        vec3 halfDir = normalize(lightDir + viewDir);
                        float specAngle = max(dot(normal, halfDir), 0.0);
                        float specular = pow(specAngle, uShininess);
                        
                        vec3 ambient = uLightColor * uAmbient;
                        vec3 diff = uLightColor * uDiffuse * diffuse;
                        vec3 spec = uLightColor * uSpecular * specular;
                        
                        vec3 finalColor = uObjectColor * (ambient + diff) + spec;
                        
                        gl_FragColor = vec4(finalColor, 1.0);
                    }
                `
            })
        );

        rock.castShadow = true;
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.scale.setScalar(0.15 + Math.random() * 0.6);

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

    const waterMat = new THREE.ShaderMaterial({ // Custom Shader 2
        uniforms: {
            uTime: { value: 0.0 },
            uWaterColor: { value: new THREE.Color(0x1e90ff) }
        },
        vertexShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying float vElevation;
            
            void main() {
                vUv = uv;
                
                vec3 pos = position;
                
                vElevation = pos.z;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uWaterColor;
            varying vec2 vUv;
            varying float vElevation;
            
            void main() {
                vec3 color = uWaterColor;
                color += vElevation * 0.5;
                gl_FragColor = vec4(color, 0.6);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = waterLevel;
    scene.add(water);

    const waterClock = new THREE.Clock();
    function updateWater() {
        const t = waterClock.getElapsedTime();
        water.position.y = waterLevel + (Math.sin(t * 0.5) * 0.09);
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

    // Z-Buffer for 3D
    let zBufferEnabled = false;

    const originalTerrainMaterial = terrainMat;

    const manualCameraNear = camera.near;
    const manualCameraFar = 50.0;

    const depthUniforms = {
        uCameraNear: { value: manualCameraNear },
        uCameraFar:  { value: manualCameraFar },
        uModelMatrix:      { value: new THREE.Matrix4() },
        uViewMatrix:       { value: new THREE.Matrix4() },
        uProjectionMatrix: { value: new THREE.Matrix4() }
    };

    // Update matrices manually
    function updateDepthUniforms() {
        depthMaterial.uniforms.uModelMatrix.value.copy(terrain.matrixWorld);
        depthMaterial.uniforms.uViewMatrix.value.copy(camera.matrixWorldInverse);
        depthMaterial.uniforms.uProjectionMatrix.value.copy(camera.projectionMatrix);
    }
    
    const depthMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            precision highp float;

            // Remove this line - position is built-in
            // attribute vec3 position;

            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;

            varying float vDepthView;

            void main() {
                // Step 1: Object space to World space
                vec4 worldPosition = uModelMatrix * vec4(position, 1.0);

                // Step 2: World space to View (camera) space
                vec4 viewPosition = uViewMatrix * worldPosition;

                // Step 3: View space to Clip space
                vec4 clipPosition = uProjectionMatrix * viewPosition;

                gl_Position = clipPosition;

                // Step 4: Extract depth
                vDepthView = -viewPosition.z;
            }
        `,
        fragmentShader: `
            precision highp float;

            uniform float uCameraNear;
            uniform float uCameraFar;

            varying float vDepthView;

            void main() {
                // Normalize depth
                float depth = (vDepthView - uCameraNear) / (uCameraFar - uCameraNear);
                depth = clamp(depth, 0.0, 1.0);
                
                // Convert to brightness
                float brightness = 1.0 - depth;

                gl_FragColor = vec4(vec3(brightness), 1.0);
            }
        `,
        uniforms: depthUniforms,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true
    });

    const zBufferToggle = document.getElementById('zBufferToggle');
    zBufferToggle.addEventListener('change', (e) => {
        zBufferEnabled = e.target.checked;
        
        if (zBufferEnabled) {
            updateDepthUniforms();
            terrain.material = depthMaterial;
            sky.visible = false;
            water.visible = false;
        } else {
            terrain.material = originalTerrainMaterial;
            sky.visible = true;
            water.visible = true;
        }
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = Math.min(clock.getDelta(), 0.1);
        
        if (terrainMat.uniforms && terrainMat.uniforms.uTime) {
            terrainMat.uniforms.uTime.value = clock.getElapsedTime();
        }
        
        if (waterMat.uniforms && waterMat.uniforms.uTime) {
            waterMat.uniforms.uTime.value = clock.getElapsedTime();
        }
        
        updateWater();
        updateParticles(delta);
        updateClouds(delta);
        controls.update();

        updateTerrainUniforms();
        updateDepthUniforms();
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}