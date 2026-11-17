// Pure self-hosted Three.js WebGL2 interactive 3D Nail Atelier renderer (no external CDN requests)
import * as THREE from '../../vendor/three/three.module.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { buildAnatomicalHandGeometry } from './hand-geometry.js';
import { buildSculptedNailGeometry } from './nail-geometry.js';
import {
  SKIN_PROFILES,
  getDermalDetailMaps,
  getMatteRoughnessCanvas,
  renderNailMaps,
} from './material-textures.js';

export const CAMERA_PRESETS = {
  editorial: {
    pos: [4.2, 17.5, 17.2],
    target: [0.15, -0.45, 2.8],
    fov: 28,
  },
  overhead: {
    pos: [0.5, 29.5, 1.2],
    target: [0.4, -0.35, 1.0],
    fov: 30,
  },
  closeup: {
    // Cleanly frames the manicured fingers with macro salon clarity
    pos: [-1.8, 13.5, 17.5],
    target: [-1.5, -0.55, 4.8],
    fov: 26,
  },
  profile: {
    pos: [13.0, 4.5, 10.5],
    target: [-0.2, -0.5, 4.8],
    fov: 24,
  },
};

// Smooth equirectangular studio softbox map: ONE lush continuous overhead window glow -> zero Y-forked glare!
function createStudioEnvironment(renderer) {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Deep luxurious salon charcoal shadow surround so dark gloss stays rich & saturated
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0.0, '#3a2d31');
  bg.addColorStop(0.45, '#251c20');
  bg.addColorStop(0.55, '#423539');
  bg.addColorStop(1.0, '#cbb7aa'); // warm silk tabletop bounce from below!
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Single broad feathered overhead daylight softbox arch (produces crisp creamy continuous curve reflection!)
  const drawSoftbox = (cx, cy, rx, ry, innerCol, outerCol) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, rx * 0.18, 0, 0, rx);
    g.addColorStop(0, innerCol);
    g.addColorStop(0.55, outerCol);
    g.addColorStop(1, 'rgba(255,250,245,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Main upper architectural softbox with crisp bright specular core for wet-glass gel brilliance!
  drawSoftbox(w * 0.42, h * 0.19, 132, 46, 'rgba(255,254,252,1.0)', 'rgba(255,244,235,0.68)');
  drawSoftbox(w * 0.42, h * 0.18, 48, 18, 'rgba(255,255,255,1.0)', 'rgba(255,255,255,0.85)');
  // Soft warm golden fill bounce on side
  drawSoftbox(w * 0.78, h * 0.42, 76, 36, 'rgba(250,224,204,0.68)', 'rgba(240,210,190,0.20)');

  const eqTex = new THREE.CanvasTexture(c);
  eqTex.mapping = THREE.EquirectangularReflectionMapping;
  eqTex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromEquirectangular(eqTex);
  eqTex.dispose();
  pmrem.dispose();
  return rt;
}

function createLinenPlinthMaps(size = 512) {
  const albedoC = document.createElement('canvas');
  const normC = document.createElement('canvas');
  albedoC.width = normC.width = size;
  albedoC.height = normC.height = size;
  const ctx = albedoC.getContext('2d');
  const nCtx = normC.getContext('2d');

  // Rich tactile woven raw ivory linen slub texture + matching tangent-space normal map!
  ctx.fillStyle = '#ebe0d4';
  ctx.fillRect(0, 0, size, size);
  const hBuf = new Float32Array(size * size);
  let seed = 4129;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const tau = Math.PI * 2;
  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    const wy = Math.sin((y / size) * tau * 42);
    const slubY = (rnd() - 0.5) * 0.25;
    for (let x = 0; x < size; x++) {
      const wx = Math.sin((x / size) * tau * 42);
      const weave = wx * 0.28 + wy * 0.28 + ((x + y) % 4 === 0 ? 0.08 : -0.08) + slubY + (rnd() - 0.5) * 0.14;
      hBuf[y * size + x] = 0.5 + weave * 0.4;
      const idx = (y * size + x) * 4;
      const delta = weave * 11;
      img.data[idx] = Math.max(0, Math.min(255, 236 + delta));
      img.data[idx + 1] = Math.max(0, Math.min(255, 224 + delta * 0.95));
      img.data[idx + 2] = Math.max(0, Math.min(255, 212 + delta * 0.88));
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const nImg = nCtx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (hBuf[y * size + xp] - hBuf[y * size + xm]) * 3.0;
      const dy = (hBuf[yp * size + x] - hBuf[ym * size + x]) * 3.0;
      const inv = 1 / Math.hypot(dx, dy, 1.0);
      const idx = (y * size + x) * 4;
      nImg.data[idx] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      nImg.data[idx + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      nImg.data[idx + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      nImg.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const tex = new THREE.CanvasTexture(albedoC);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.colorSpace = THREE.SRGBColorSpace;

  const normalTex = new THREE.CanvasTexture(normC);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(9, 9);
  return { tex, normalTex };
}

let cachedHandGeoData = null;

export class Atelier3DRenderer {
  constructor(container, { onContextLost, onContextRestored, interactive = true } = {}) {
    this.container = container;
    this.onContextLost = onContextLost;
    this.onContextRestored = onContextRestored;
    this.interactive = interactive;
    this.disposed = false;
    this.currentPreset = 'editorial';
    this.lastConfigKey = '';
    this.animFrame = null;
    this.needsRender = true;
    this.camLerp = null;
    this.pearlMeshes = [];
    this.nailMeshes = [];

    const width = Math.max(260, container.clientWidth || 520);
    const height = Math.max(240, container.clientHeight || 520);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: interactive ? 'high-performance' : 'low-power',
      preserveDrawingBuffer: true, // ensures snapshot capture & screenshots always retain framebuffer
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.canvas = this.renderer.domElement;
    this.canvas.className = 'atelier-3d-canvas';
    this.canvas.setAttribute('role', 'img');
    this.container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#eadfd6');
    this.scene.fog = new THREE.Fog('#eadfd6', 28, 56);

    const p0 = CAMERA_PRESETS.editorial;
    this.camera = new THREE.PerspectiveCamera(p0.fov, width / height, 0.5, 80);
    this.camera.position.set(...p0.pos);

    this.envRT = createStudioEnvironment(this.renderer);
    this.scene.environment = this.envRT.texture;

    this.#setupLighting();
    this.#setupPlinth();
    this.#setupHandMesh();
    this.#setupNailMaterials();
    this.#setupControls();
    this.#bindEvents();
  }

  #setupLighting() {
    this.hemi = new THREE.HemisphereLight('#fffaf5', '#cbb19d', 0.44);
    this.scene.add(this.hemi);

    // Side-angled morning sun key light casting grounded warm shadows beneath palm and fingers across linen folds!
    this.keyLight = new THREE.DirectionalLight('#fff4e8', 1.62);
    this.keyLight.position.set(-7.8, 10.5, 4.2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 34;
    const d = 13.0;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.015;
    this.keyLight.shadow.radius = 4.5;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight('#f8ded3', 0.36);
    this.fillLight.position.set(10.0, 6.0, 5.0);
    this.scene.add(this.fillLight);

    this.backRimLight = new THREE.DirectionalLight('#fff2e8', 0.30);
    this.backRimLight.position.set(1.5, 5.0, -9.0);
    this.scene.add(this.backRimLight);
  }

  #setupPlinth() {
    const maps = createLinenPlinthMaps(512);
    this.plinthTex = maps.tex;
    this.plinthNormalTex = maps.normalTex;

    const plinthGeo = new THREE.PlaneGeometry(110, 110, 64, 64);
    const pos = plinthGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.hypot(x - 0.5, y - 0.5);
      // Soft draped luxury linen folds cradling hand
      const fold =
        (Math.sin(x * 0.34 + y * 0.22) * 0.28 + Math.sin(x * 0.14 - y * 0.30) * 0.18) *
        Math.min(1, Math.max(0, (dist - 3.0) / 6.5));
      const pillowDip = -0.36 * Math.exp(-(dist * dist) / 48.0);
      pos.setZ(i, fold + pillowDip);
    }
    plinthGeo.computeVertexNormals();

    this.plinthMat = new THREE.MeshStandardMaterial({
      map: this.plinthTex,
      normalMap: this.plinthNormalTex,
      normalScale: new THREE.Vector2(0.55, 0.55),
      color: '#ede3d7',
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.32,
    });
    this.plinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    this.plinth.rotation.x = -Math.PI * 0.5;
    this.plinth.position.set(0, -1.36, 0);
    this.plinth.receiveShadow = true;
    this.scene.add(this.plinth);
  }

  #setupHandMesh() {
    if (!cachedHandGeoData) {
      cachedHandGeoData = buildAnatomicalHandGeometry({ subdivisionLevels: 2, verify: false });
    }
    this.handAnchors = cachedHandGeoData.nailAnchors;

    // Snug elliptical 18k rose-gold band fitted seamlessly onto Ring finger proximal phalanx
    if (cachedHandGeoData.jewelryAnchor) {
      const ja = cachedHandGeoData.jewelryAnchor;
      const ringGeo = new THREE.TorusGeometry(ja.rx * 0.985, 0.052, 16, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#dfba86'),
        metalness: 0.95,
        roughness: 0.16,
        envMapIntensity: 1.5,
      });
      this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
      this.ringMesh.position.set(ja.center.x, ja.center.y, ja.center.z);
      const rq = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(ja.frame.forward.x, ja.frame.forward.y, ja.frame.forward.z),
      );
      this.ringMesh.quaternion.copy(rq);
      this.ringMesh.scale.set(1.0, (ja.ry / ja.rx) * 0.985, 1.0);
      this.ringMesh.castShadow = true;
      this.ringGeo = ringGeo;
      this.ringMat = ringMat;
      this.scene.add(this.ringMesh);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(cachedHandGeoData.positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(cachedHandGeoData.uvs, 2));
    geo.setAttribute('skinData', new THREE.BufferAttribute(cachedHandGeoData.skinData, 3));
    geo.setIndex(new THREE.BufferAttribute(cachedHandGeoData.indices, 1));
    geo.computeVertexNormals();
    this.handGeo = geo;

    const dermalMaps = getDermalDetailMaps(512);
    this.skinNormalTex = new THREE.CanvasTexture(dermalMaps.normalCanvas);
    this.skinNormalTex.wrapS = this.skinNormalTex.wrapT = THREE.RepeatWrapping;
    this.skinNormalTex.repeat.set(6.0, 6.0);
    this.skinRoughTex = new THREE.CanvasTexture(dermalMaps.roughCanvas);
    this.skinRoughTex.wrapS = this.skinRoughTex.wrapT = THREE.RepeatWrapping;
    this.skinRoughTex.repeat.set(6.0, 6.0);

    const prof = SKIN_PROFILES.warm;
    this.sssUniforms = {
      uSssColor: { value: new THREE.Color(prof.sssHex) },
      uShadowColor: { value: new THREE.Color(prof.shadowHex) },
    };

    this.handMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(prof.baseHex),
      roughness: 0.76,
      roughnessMap: this.skinRoughTex,
      normalMap: this.skinNormalTex,
      normalScale: new THREE.Vector2(0.36, 0.36),
      metalness: 0.0,
      specularIntensity: 0.28,
      specularColor: new THREE.Color('#ffe5d6'),
      sheen: 0.44,
      sheenRoughness: 0.64,
      sheenColor: new THREE.Color(prof.sheenHex),
      clearcoat: 0.0,
      envMapIntensity: 0.32,
    });

    // Inject organic Subsurface Hemoglobin Warmth, Cuticle Socket AO, and Wrap-Around Dermal SSS!
    this.handMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSssColor = this.sssUniforms.uSssColor;
      shader.uniforms.uShadowColor = this.sssUniforms.uShadowColor;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           attribute vec3 skinData;
           varying vec3 vSkinData;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vSkinData = skinData;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform vec3 uSssColor;
           uniform vec3 uShadowColor;
           varying vec3 vSkinData;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float aoFactor = clamp(vSkinData.x, 0.48, 1.0);
           float warmth = clamp(vSkinData.y, 0.0, 1.0);
           float creaseShade = clamp(vSkinData.z, 0.0, 1.0);
           diffuseColor.rgb = mix(diffuseColor.rgb, uSssColor, warmth * 0.22);
           diffuseColor.rgb = mix(uShadowColor, diffuseColor.rgb, aoFactor * (1.0 - creaseShade * 0.16));`,
        )
        .replace(
          '#include <opaque_fragment>',
          `// Soft dermal wrap-around subsurface scattering bleed across shadow terminator
           float viewRim = 1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0);
           outgoingLight += uSssColor * pow(viewRim, 2.4) * (0.08 + vSkinData.y * 0.09);
           #include <opaque_fragment>`,
        );
    };

    this.handMesh = new THREE.Mesh(this.handGeo, this.handMat);
    this.handMesh.castShadow = true;
    this.handMesh.receiveShadow = true;
    this.scene.add(this.handMesh);
  }

  #setupNailMaterials() {
    this.nailAlbedoPlain = new THREE.CanvasTexture(document.createElement('canvas'));
    this.nailAlbedoPlain.colorSpace = THREE.SRGBColorSpace;
    this.nailAlbedoPlain.anisotropy = 4;

    this.nailAlbedoAccent = new THREE.CanvasTexture(document.createElement('canvas'));
    this.nailAlbedoAccent.colorSpace = THREE.SRGBColorSpace;
    this.nailAlbedoAccent.anisotropy = 4;

    this.nailMetalTex = new THREE.CanvasTexture(document.createElement('canvas'));
    this.nailBumpTex = new THREE.CanvasTexture(document.createElement('canvas'));

    this.matteRoughTex = new THREE.CanvasTexture(getMatteRoughnessCanvas(256));
    this.matteRoughTex.wrapS = this.matteRoughTex.wrapT = THREE.RepeatWrapping;

    this.nailPlainMat = new THREE.MeshPhysicalMaterial({
      map: this.nailAlbedoPlain,
      roughness: 0.06,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      ior: 1.54,
      reflectivity: 0.95,
      envMapIntensity: 1.75,
    });

    this.nailAccentMat = new THREE.MeshPhysicalMaterial({
      map: this.nailAlbedoAccent,
      metalnessMap: this.nailMetalTex,
      normalMap: this.nailBumpTex,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.07,
      metalness: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      ior: 1.54,
      reflectivity: 0.95,
      envMapIntensity: 1.85,
    });

    this.pearlMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#fff8f0'),
      roughness: 0.12,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      iridescence: 1.0,
      iridescenceIOR: 1.42,
      iridescenceThicknessRange: [190, 460],
      envMapIntensity: 1.8,
    });
    this.pearlGeo = new THREE.SphereGeometry(0.115, 22, 16);
    this.pearlGeo.scale(1.0, 0.68, 1.0);
    this.bezelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d8b17b'),
      metalness: 0.94,
      roughness: 0.22,
      envMapIntensity: 1.5,
    });
    this.bezelGeo = new THREE.TorusGeometry(0.112, 0.018, 10, 24);
    this.bezelGeo.rotateX(Math.PI * 0.5);
  }

  #setupControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.enableZoom = this.interactive;
    this.controls.enableRotate = this.interactive;
    this.controls.minDistance = 8.5;
    this.controls.maxDistance = 32.0;
    this.controls.minPolarAngle = 0.16;
    this.controls.maxPolarAngle = Math.PI * 0.455;
    this.controls.minAzimuthAngle = -Math.PI * 0.46;
    this.controls.maxAzimuthAngle = Math.PI * 0.46;
    const p0 = CAMERA_PRESETS.editorial;
    this.controls.target.set(...p0.target);
    this.controls.update();

    if (!this.interactive) {
      this.canvas.style.pointerEvents = 'none';
    }
  }

  #bindEvents() {
    this._onControlsChange = () => this.requestRender();
    this.controls.addEventListener('change', this._onControlsChange);

    this._onContextLost = (e) => {
      e.preventDefault();
      if (this.onContextLost) this.onContextLost();
    };
    this._onContextRestored = () => {
      this.requestRender();
      if (this.onContextRestored) this.onContextRestored();
    };
    this.canvas.addEventListener('webglcontextlost', this._onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this._onContextRestored);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(this.container);
    } else {
      this._onWinResize = () => this.resize();
      window.addEventListener('resize', this._onWinResize);
    }
  }

  resize() {
    if (this.disposed) return;
    const w = Math.max(200, this.container.clientWidth || 520);
    const h = Math.max(200, this.container.clientHeight || 520);
    if (this.camera.aspect !== w / h) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(w, h, false);
    this.requestRender();
  }

  setLightAngle(lightX = 45) {
    // Map slider [15..85] cleanly into natural key light arc overhead-left to overhead-right
    const norm = ((Math.max(10, Math.min(90, Number(lightX) || 45)) - 50) / 40) * 10.5;
    this.keyLight.position.set(norm, 14.5, 7.5);
    this.requestRender();
  }

  setCameraPreset(presetId = 'editorial', immediate = false) {
    const preset = CAMERA_PRESETS[presetId] || CAMERA_PRESETS.editorial;
    this.currentPreset = presetId;
    if (immediate) {
      this.camLerp = null;
      this.camera.fov = preset.fov;
      this.camera.position.set(...preset.pos);
      this.camera.updateProjectionMatrix();
      this.controls.target.set(...preset.target);
      this.controls.update();
      this.requestRender();
      return;
    }
    this.camLerp = {
      startPos: this.camera.position.clone(),
      endPos: new THREE.Vector3(...preset.pos),
      startTarget: this.controls.target.clone(),
      endTarget: new THREE.Vector3(...preset.target),
      startFov: this.camera.fov,
      endFov: preset.fov,
      progress: 0,
    };
    this.requestRender();
  }

  updateConfig(cfg, { lightX = 45, immediate = false } = {}) {
    if (this.disposed) return;
    this.setLightAngle(lightX);

    const shape = cfg.shape || 'almond';
    const length = cfg.length || 'medium';
    const skin = cfg.skin || 'warm';
    const finish = cfg.finish || 'gloss';
    const accent = cfg.accent || 'none';
    const geoKey = `${shape}:${length}`;

    // 1. Update skin undertone profile cleanly
    const skinProf = SKIN_PROFILES[skin] || SKIN_PROFILES.warm;
    this.handMat.color.set(skinProf.baseHex);
    this.handMat.sheenColor.set(skinProf.sheenHex);
    this.sssUniforms.uSssColor.value.set(skinProf.sssHex);
    this.sssUniforms.uShadowColor.value.set(skinProf.shadowHex);

    // 2. Rebuild parametric nail geometry ONLY if shape or length changed
    if (geoKey !== this._lastGeoKey) {
      this._lastGeoKey = geoKey;
      for (const m of this.nailMeshes) {
        this.scene.remove(m);
        m.geometry.dispose();
      }
      for (const p of this.pearlMeshes) {
        this.scene.remove(p);
      }
      this.nailMeshes = [];
      this.pearlMeshes = [];

      const fingerIds = ['thumb', 'index', 'middle', 'ring', 'pinky'];
      for (const fid of fingerIds) {
        const anchor = this.handAnchors[fid];
        const nailData = buildSculptedNailGeometry(anchor, shape, length);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(nailData.positions, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(nailData.uvs, 2));
        geo.setIndex(new THREE.BufferAttribute(nailData.indices, 1));
        geo.computeVertexNormals();

        const isAccentFinger = fid === 'ring' || fid === 'thumb';
        const mesh = new THREE.Mesh(geo, isAccentFinger ? this.nailAccentMat : this.nailPlainMat);
        mesh.userData = { fid, pearlSpot: nailData.pearlSpot, frame: anchor.frame };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.nailMeshes.push(mesh);

        if (isAccentFinger) {
          const pearlGroup = new THREE.Group();
          const pearl = new THREE.Mesh(this.pearlGeo, this.pearlMat);
          const bezel = new THREE.Mesh(this.bezelGeo, this.bezelMat);
          bezel.position.y = -0.018;
          pearlGroup.add(pearl, bezel);
          pearlGroup.position.set(
            nailData.pearlSpot[0] + anchor.frame.up.x * 0.036,
            nailData.pearlSpot[1] + anchor.frame.up.y * 0.036,
            nailData.pearlSpot[2] + anchor.frame.up.z * 0.036,
          );
          const q = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(anchor.frame.up.x, anchor.frame.up.y, anchor.frame.up.z),
          );
          pearlGroup.quaternion.copy(q);
          pearlGroup.scale.setScalar(fid === 'thumb' ? 1.15 : 0.96);
          pearl.castShadow = true;
          pearlGroup.visible = accent === 'pearl_dot';
          this.scene.add(pearlGroup);
          this.pearlMeshes.push(pearlGroup);
        }
      }
    } else {
      for (const p of this.pearlMeshes) {
        p.visible = accent === 'pearl_dot';
      }
    }

    // 3. Re-paint plain & accent nail UV textures
    const plainMaps = renderNailMaps(
      { ...cfg, accent: 'none' },
      {
        albedoCanvas: this.nailAlbedoPlain.image,
        metalCanvas: this.nailMetalTex.image,
        bumpCanvas: this.nailBumpTex.image,
      },
    );
    this.nailAlbedoPlain.image = plainMaps.albedoCanvas;
    this.nailAlbedoPlain.needsUpdate = true;

    const accentMaps =
      accent !== 'none' && accent !== 'pearl_dot'
        ? renderNailMaps(cfg, {
          albedoCanvas: this.nailAlbedoAccent.image,
          metalCanvas: this.nailMetalTex.image,
          bumpCanvas: this.nailBumpTex.image,
        })
        : plainMaps;

    this.nailAlbedoAccent.image = accentMaps.albedoCanvas;
    this.nailAlbedoAccent.needsUpdate = true;
    this.nailMetalTex.image = accentMaps.metalCanvas;
    this.nailMetalTex.needsUpdate = true;
    this.nailBumpTex.image = accentMaps.bumpCanvas;
    this.nailBumpTex.needsUpdate = true;

    // 4. Configure physical coating optics cleanly per finish (`gloss` vs `pearl` vs `matte`)
    const applyCoat = (mat, hasMetal = false) => {
      mat.metalness = hasMetal && accent === 'gold_foil' ? 0.94 : 0.0;
      mat.normalScale.set(accent === 'gold_foil' || accent === 'floral_dot' ? 0.45 : 0, accent === 'gold_foil' || accent === 'floral_dot' ? 0.45 : 0);

      if (finish === 'matte') {
        mat.roughness = 0.78;
        mat.roughnessMap = this.matteRoughTex;
        mat.clearcoat = 0.0;
        mat.clearcoatRoughness = 0.85;
        mat.iridescence = 0.0;
        mat.sheen = 0.28;
        mat.sheenRoughness = 0.72;
        mat.sheenColor = new THREE.Color('#f7ece6');
        mat.envMapIntensity = 0.36;
      } else if (finish === 'pearl') {
        mat.roughness = 0.14;
        mat.roughnessMap = null;
        mat.clearcoat = 0.95;
        mat.clearcoatRoughness = 0.06;
        mat.iridescence = 1.0;
        mat.iridescenceIOR = 1.38;
        mat.iridescenceThicknessRange = [180, 440];
        mat.sheen = 0.35;
        mat.sheenColor = new THREE.Color('#fbeee6');
        mat.envMapIntensity = 1.38;
      } else {
        // gloss (wet mirror gel) - preserves deep burgundy/plum pigment while reflecting bright feathered softbox!
        mat.roughness = 0.035;
        mat.roughnessMap = null;
        mat.clearcoat = 1.0;
        mat.clearcoatRoughness = 0.015;
        mat.iridescence = 0.0;
        mat.sheen = 0.0;
        mat.envMapIntensity = 1.38;
      }
      mat.needsUpdate = true;
    };

    applyCoat(this.nailPlainMat, false);
    applyCoat(this.nailAccentMat, true);

    if (immediate) {
      this.renderOnce();
    } else {
      this.requestRender();
    }
  }

  requestRender() {
    if (this.disposed || this.animFrame !== null) return;
    this.animFrame = requestAnimationFrame(() => this.#tick());
  }

  renderOnce() {
    if (this.disposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  captureDataURL(mime = 'image/webp', quality = 0.92) {
    this.renderOnce();
    return this.canvas.toDataURL(mime, quality);
  }

  #tick() {
    this.animFrame = null;
    if (this.disposed) return;

    let keepGoing = false;
    if (this.camLerp) {
      this.camLerp.progress = Math.min(1, this.camLerp.progress + 0.085);
      const t = 1 - Math.pow(1 - this.camLerp.progress, 3);
      this.camera.position.lerpVectors(this.camLerp.startPos, this.camLerp.endPos, t);
      this.controls.target.lerpVectors(this.camLerp.startTarget, this.camLerp.endTarget, t);
      this.camera.fov = this.camLerp.startFov + (this.camLerp.endFov - this.camLerp.startFov) * t;
      this.camera.updateProjectionMatrix();
      if (this.camLerp.progress >= 1) {
        this.camLerp = null;
      } else {
        keepGoing = true;
      }
    }

    const damped = this.controls.update();
    if (damped) keepGoing = true;

    this.renderer.render(this.scene, this.camera);
    if (keepGoing) this.requestRender();
  }

  dispose() {
    this.disposed = true;
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.controls.removeEventListener('change', this._onControlsChange);
    this.controls.dispose();
    this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored);
    if (this.resizeObs) this.resizeObs.disconnect();
    if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);

    this.handGeo?.dispose();
    this.plinth?.geometry?.dispose();
    this.pearlGeo?.dispose();
    this.bezelGeo?.dispose();
    this.ringGeo?.dispose();
    for (const m of this.nailMeshes) m.geometry.dispose();

    this.handMat?.dispose();
    this.plinthMat?.dispose();
    this.nailPlainMat?.dispose();
    this.nailAccentMat?.dispose();
    this.pearlMat?.dispose();
    this.bezelMat?.dispose();
    this.ringMat?.dispose();

    this.skinNormalTex?.dispose();
    this.skinRoughTex?.dispose();
    this.plinthTex?.dispose();
    this.plinthNormalTex?.dispose();
    this.nailAlbedoPlain?.dispose();
    this.nailAlbedoAccent?.dispose();
    this.nailMetalTex?.dispose();
    this.nailBumpTex?.dispose();
    this.matteRoughTex?.dispose();
    this.envRT?.dispose();

    this.renderer?.dispose();
    this.canvas?.remove();
  }
}
