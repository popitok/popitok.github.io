// Real-geometry 3D phone (Three.js). Reads the eased cursor value that main.js publishes
// on window.popiParallax, so the phone and the background logo move in step.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.querySelector('.phone3d');
if (host) init().catch(err => console.warn('3D phone unavailable, using flat phone', err));

async function init() {
  const canvas = host.querySelector('canvas');
  const W = 720, H = 760;                       // CSS px; 1 scene unit = 1 CSS px at z = 0 (wide enough for the shadow)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  // render sharper when the canvas is scaled up to fit a large screen
  const sharpen = () => {
    renderer.setPixelRatio(Math.min(devicePixelRatio * Math.max(1, window.popiPhoneScale || 1), 3));
    renderer.setSize(W, H, false);
  };
  sharpen();
  addEventListener('popi:phonescale', sharpen);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 10, 5000);
  camera.position.z = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  // warm sunlight falling from the upper left, a little more from above than from the front
  const key = new THREE.DirectionalLight(0xffd6a0, 1.5);
  key.position.set(-450, 800, 650);
  scene.add(key);
  // soft warm fill grazing the left and top frame edges from slightly behind
  const rim = new THREE.DirectionalLight(0xffc27a, 1.1);
  rim.position.set(-700, 600, -200);
  scene.add(rim);

  // ---- dimensions (CSS px) ----
  const PW = 318, PH = 666, R = 54, DEPTH = 36, BEVEL = 6;
  const SW = 298, SH = 646, SR = 44;             // screen

  const phone = new THREE.Group();
  scene.add(phone);

  // body: extruded rounded rectangle with a soft bevel = the metal frame
  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(PW - BEVEL * 2, PH - BEVEL * 2, R - BEVEL), {
    depth: DEPTH - BEVEL * 2, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL,
    bevelSegments: 8, curveSegments: 48,
  });
  bodyGeo.translate(0, 0, -(DEPTH - BEVEL * 2) / 2);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x3b4048, metalness: 1, roughness: 0.32, clearcoat: 0.4 });
  phone.add(new THREE.Mesh(bodyGeo, frameMat));

  // front black glass (covers the flat face inside the bevel)
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x07080a, metalness: 0, roughness: 0.08 });
  const toLight = new THREE.Vector3(-450, 800, 650).normalize();   // same direction as the key light
  const faceNormal = new THREE.Vector3();
  const front = new THREE.Mesh(shapeGeo(PW - BEVEL * 2 + 2, PH - BEVEL * 2 + 2, R - BEVEL), glassMat);
  front.position.z = DEPTH / 2 + 0.2;
  phone.add(front);

  // back glass + camera plateau
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x2c3036, metalness: 0.2, roughness: 0.45, clearcoat: 1 });
  const back = new THREE.Mesh(shapeGeo(PW - BEVEL * 2 + 2, PH - BEVEL * 2 + 2, R - BEVEL), backMat);
  back.position.z = -DEPTH / 2 - 0.2; back.rotation.y = Math.PI;
  phone.add(back);
  const bumpGeo = new THREE.ExtrudeGeometry(roundedRect(120, 124, 30), { depth: 3, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 4, curveSegments: 24 });
  const bump = new THREE.Mesh(bumpGeo, backMat);
  bump.position.set(PW / 2 - 18 - 60, PH / 2 - 18 - 62, -DEPTH / 2 - 6); // seen from the back it sits top-left
  phone.add(bump);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, metalness: 0.6, roughness: 0.1, clearcoat: 1 });
  for (const [lx, ly] of [[-26, 28], [-26, -28], [28, 0]]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(20, 21, 6, 40), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(bump.position.x - lx, bump.position.y + ly, -DEPTH / 2 - 10);
    phone.add(lens);
  }

  // side buttons
  const btn = (x, y, h) => {
    const g = new THREE.CapsuleGeometry(2.4, h, 4, 12);
    const m = new THREE.Mesh(g, frameMat);
    m.position.set(x, y, 0); phone.add(m);
  };
  btn(-PW / 2 - 1, 170, 26);   // action
  btn(-PW / 2 - 1, 110, 50);   // volume up
  btn(-PW / 2 - 1, 45, 50);    // volume down
  btn(PW / 2 + 1, 95, 80);     // side

  // screen
  const tex = new THREE.CanvasTexture(await drawScreen(SW, SH));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const screen = new THREE.Mesh(shapeGeo(SW, SH, SR, true), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = DEPTH / 2 + 0.4;
  phone.add(screen);

  // warm light spilling across the glass from the upper left; stronger as the face turns toward the light
  const warmTex = new THREE.CanvasTexture(warmLightCanvas());
  warmTex.colorSpace = THREE.SRGBColorSpace;
  const sheenMat = new THREE.MeshBasicMaterial({ map: warmTex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.5 });
  const sheen = new THREE.Mesh(shapeGeo(SW, SH, SR, true), sheenMat);
  sheen.position.z = DEPTH / 2 + 0.6;
  phone.add(sheen);

  // Shadows live in their own scene, drawn first; the phone is drawn over them with a fresh depth buffer,
  // so a phone tilted far back can never sink behind a shadow plane and get covered by it.
  const shadowScene = new THREE.Scene();
  renderer.autoClear = false;
  // deep shadow behind the phone: a dark core close behind it plus a wide soft falloff further back
  const shadowPlane = (w, h, inner, alpha, rgb, opacity, y, z) => {
    const tex = new THREE.CanvasTexture(shadowCanvas(inner, alpha, rgb));
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity,
    }));
    m.position.set(0, y, z); m.userData.base = opacity; shadowScene.add(m); return m;
  };
  // light comes from the upper left, so both layers fall toward the lower right
  // both are wider than the phone so the dark part shows around it, and stay inside the canvas
  const shadowWide = shadowPlane(640, 960, 20, 0.5, '6,30,64', 1, -90, -180);
  const shadow = shadowPlane(500, 850, 50, 0.8, '4,20,45', 0.9, -50, -70);
  // soft warm light spilling from behind the phone's upper-left edge, opposite the shadow
  const glow = shadowPlane(420, 820, 40, 0.45, '255,190,120', 0.5, 60, -60);
  glow.position.x = -90;
  const SHADOW_X = { core: 36, wide: 60 };

  document.documentElement.classList.add('has-3d');

  const tick = () => {
    const p = window.popiParallax || { x: 0, y: 0 };
    const f = p.float || { x: 0, y: 0, rx: 0, ry: 0, rz: 0, sc: 0 };
    phone.rotation.y = p.x * 0.42 + f.ry;   // ~24°, face turns toward the cursor
    phone.rotation.x = p.y * 0.26 + f.rx;   // ~15°
    phone.rotation.z = f.rz;
    phone.position.set(p.x * 14 + (f.x || 0), -p.y * 8 + f.y, 0);
    phone.scale.setScalar(1 + (f.sc || 0));   // gentle breathing while it floats
    // warm light on the glass: a soft base, brightening as the screen turns toward the light
    faceNormal.set(0, 0, 1).applyEuler(phone.rotation);
    const facing = faceNormal.dot(toLight);
    const k = Math.min(1, Math.max(0, (facing - 0.6) / 0.35));
    sheenMat.opacity = 0.25 + 0.6 * k * k * (3 - 2 * k);
    // the shadow stays behind and softens as the phone rises
    shadow.position.x = SHADOW_X.core - p.x * 18;
    shadowWide.position.x = SHADOW_X.wide - p.x * 30;
    for (const m of [shadow, shadowWide]) {
      m.scale.setScalar(1 - f.y * 0.004);
      m.material.opacity = m.userData.base - f.y * 0.015;
    }
    renderer.clear();
    renderer.render(shadowScene, camera);
    renderer.clearDepth();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// flat rounded rectangle; with uv = true the texture spans the whole rectangle
function shapeGeo(w, h, r, uv = false) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 48);
  if (uv) {
    const pos = g.attributes.position, uvs = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uvs.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    uvs.needsUpdate = true;
  }
  return g;
}

// the splash screen from Figma (ooori_Splash at 0.74 scale), drawn at 3x
async function drawScreen(w, h) {
  const k = 3, c = document.createElement('canvas');
  c.width = w * k; c.height = h * k;
  const g = c.getContext('2d');
  g.scale(k, k);
  g.fillStyle = '#3aa2e9';   // 화면도 페이지와 같은 한 톤
  g.fillRect(0, 0, w, h);

  const font = '-apple-system, BlinkMacSystemFont, "SF Pro", "Apple SD Gothic Neo", sans-serif';
  g.fillStyle = '#fff';
  g.font = `600 13px ${font}`; g.textBaseline = 'middle';
  g.fillText('9:41', 30, 24);
  // dynamic island
  g.fillStyle = '#000'; roundRectPath(g, w / 2 - 46, 9, 92, 27, 13.5); g.fill();
  // cellular / wifi / battery
  g.fillStyle = '#fff';
  [[0, 8, 4], [5, 6, 6], [10, 3, 9], [15, 0, 12]].forEach(([x, y, hh]) => { roundRectPath(g, w - 92 + x, 18 + y, 3, hh, 1); g.fill(); });
  g.beginPath(); g.moveTo(w - 58, 21); g.arc(w - 51.5, 30, 10, -Math.PI * 0.75, -Math.PI * 0.25); g.lineTo(w - 51.5, 30); g.closePath(); g.fill();
  g.globalAlpha = 0.5; g.strokeStyle = '#fff'; roundRectPath(g, w - 40.5, 18.5, 22, 11, 3.2); g.stroke();
  g.globalAlpha = 1; roundRectPath(g, w - 39, 20, 19, 8, 2); g.fill();

  const logo = await loadImage('assets/logo-gradient.svg');   // the screen keeps the original shaded cloud; the page logo is flat white
  const lw = 121, lh = lw * 55 / 74;
  g.drawImage(logo, (w - lw) / 2, 280, lw, lh);

  g.fillStyle = '#efefef'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `700 16px ${font}`; g.fillText('Pop it, OK?', w / 2, 492);
  g.font = `400 10.5px ${font}`; g.fillText('Say hi. See where it goes.', w / 2, 510);
  return c;
}

function warmLightCanvas() {
  // sunlight pooling in the upper-left corner of the glass and fading out across it
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(0, 0, 0, 0, 0, 440);
  r.addColorStop(0, 'rgba(255,214,160,0.75)');
  r.addColorStop(0.35, 'rgba(255,190,120,0.35)');
  r.addColorStop(1, 'rgba(255,170,100,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 512);
  return c;
}

function shadowCanvas(inner = 10, alpha = 0.5, rgb = '10,45,90') {
  // 512x912, gaussian falloff with many stops, then dithered so 8-bit alpha shows no banding
  const Wc = 512, Hc = 912, c = document.createElement('canvas'); c.width = Wc; c.height = Hc;
  const g = c.getContext('2d');
  g.translate(Wc / 2, Hc / 2); g.scale(1, Hc / Wc);
  const R = Wc / 2 - 12, r0 = inner * 2;
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, R);
  for (let i = 0; i <= 32; i++) {
    const t = i / 32, d = Math.max(0, (t * R - r0) / (R - r0));
    grad.addColorStop(t, `rgba(${rgb},${(alpha * Math.exp(-d * d * 4.5) * (1 - d ** 8)).toFixed(4)})`);
  }
  g.fillStyle = grad; g.fillRect(-Wc / 2, -Wc / 2, Wc, Wc);
  const img = g.getImageData(0, 0, Wc, Hc), px = img.data;
  for (let i = 3; i < px.length; i += 4) if (px[i]) px[i] = Math.min(255, Math.max(0, px[i] + (Math.random() - 0.5) * 3));
  g.putImageData(img, 0, 0);
  return c;
}

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
