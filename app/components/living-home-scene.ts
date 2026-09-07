import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type SceneState = { evening: boolean; paused: boolean };

/** A lightweight, illustrative home. No customer records are rendered here. */
export function mountHome(host: HTMLElement, getState: () => SceneState) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(7.8, 6.7, 10.2); camera.lookAt(0, 1.15, 0);
  const home = new THREE.Group(); world.add(home);
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const material = (color: number, roughness = .8) => { const m = new THREE.MeshStandardMaterial({ color, roughness }); materials.push(m); return m; };
  const ivory = material(0xfff0d6), teal = material(0x387d73), clay = material(0xca6943), pale = material(0xfce4bf);
  const grass = material(0xa4c6aa), leaf = material(0x488a6e), leafLight = material(0x7cad83), wood = material(0x8c6147);
  const windowMat = material(0xa4d7d8), cloudMat = material(0xffffff);
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = home) => {
    geometries.push(geo); const obj = new THREE.Mesh(geo, mat); obj.position.set(x, y, z); obj.castShadow = true; obj.receiveShadow = true; parent.add(obj); return obj;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, radius = .07, parent: THREE.Object3D = home) => mesh(new RoundedBoxGeometry(w, h, d, 2, radius), mat, x, y, z, parent);
  const sphere = (r: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = home) => mesh(new THREE.SphereGeometry(r, 12, 10), mat, x, y, z, parent);

  // A low garden plinth and stepping-stone approach.
  box(5.7, .3, 4.7, pale, 0, -.12, .15, .2);
  box(5.45, .08, 4.45, grass, 0, .05, .15, .15);
  for (let i = 0; i < 4; i++) box(.65, .07, .3, ivory, .5, .12, 1.25 + i * .3, .06);
  box(3.25, 2.9, 2.2, ivory, -.3, 1.55, -.5, .16);
  box(3.65, .18, 2.55, clay, -.3, 3.05, -.5, .08);
  // Roof terrace, softly rounded parapet and a tiny pergola.
  box(3.45, .22, .12, pale, -.3, 3.24, -1.68);
  box(.12, .22, 2.3, pale, -1.98, 3.24, -.55);
  box(.12, .22, 2.3, pale, 1.38, 3.24, -.55);
  for (const x of [-1.25, .8]) for (const z of [-1.15, .2]) box(.08, .72, .08, wood, x, 3.55, z, .02);
  for (let i = 0; i < 6; i++) box(2.3, .08, .14, wood, -.22, 3.91, -1.23 + i * .3, .02);
  // Windows, frames and narrow balcony rails make the miniature legible.
  for (const y of [.93, 2.15]) for (const x of [-1.22, .08, .84]) {
    box(.58, .79, .1, teal, x, y, .635, .04);
    box(.43, .64, .04, windowMat, x, y, .702, .025);
    box(.04, .65, .03, ivory, x, y, .736, .01);
  }
  box(.65, 1.07, .15, teal, -.5, .67, .67);
  sphere(.037, pale, -.3, .67, .77);
  box(3.43, .14, .64, pale, -.3, 1.67, .8);
  box(3.4, .06, .06, teal, -.3, 2.03, 1.06, .02);
  for (let i = 0; i < 13; i++) box(.035, .34, .035, teal, -1.85 + i * .26, 1.86, 1.06, .01);
  for (const y of [1, 2.2]) for (const z of [-1.1, -.15]) {
    box(.1, .75, .53, teal, 1.345, y, z, .035);
    box(.035, .6, .38, windowMat, 1.407, y, z, .02);
  }
  // Planters and softly swaying trees.
  const trees: THREE.Group[] = [];
  for (const [x, z, scale] of [[-2.15, .65, .85], [2.03, -.8, 1.1], [2.13, 1.25, .7]]) {
    const tree = new THREE.Group(); tree.position.set(x, .12, z); tree.scale.setScalar(scale); home.add(tree); trees.push(tree);
    mesh(new THREE.CylinderGeometry(.05, .075, .9, 8), wood, 0, .45, 0, tree);
    sphere(.43, leaf, 0, 1.06, 0, tree); sphere(.32, leafLight, .17, 1.3, .08, tree); sphere(.3, leafLight, -.23, 1.12, .06, tree);
    mesh(new THREE.CylinderGeometry(.22, .17, .3, 12), clay, 0, .15, 0, tree);
  }
  for (const x of [-1.4, .8]) {
    box(.36, .23, .32, clay, x, 1.85, .85, .05);
    sphere(.18, leaf, x, 2.04, .85);
    box(.38, .26, .34, clay, x, 3.28, -.9, .04);
    sphere(.23, leafLight, x, 3.52, -.9);
  }
  // A courtyard bench, welcoming lamp and small hanging light bulbs.
  box(.38, .12, 1.1, wood, 1.92, .48, .25);
  box(.09, .34, .9, wood, 2.07, .68, .25);
  for (const z of [-.12, .62]) box(.08, .35, .08, teal, 1.9, .26, z, .02);
  const bulbMat = material(0xffe7ab); bulbMat.emissive.set(0xffbd59);
  for (let i = 0; i < 6; i++) sphere(.045, bulbMat, -1.4 + i * .45, 3.7 - Math.sin(i / 5 * Math.PI) * .16, .3);
  box(.07, 1.05, .07, teal, -.85, .6, 1.83, .02); sphere(.15, bulbMat, -.85, 1.22, 1.83);
  const lamp = new THREE.PointLight(0xffc57a, 0, 4); lamp.position.set(.2, 1.7, 1.7); home.add(lamp);
  const clouds: THREE.Group[] = [];
  for (const [x, y, z] of [[-2.7, 4, -.7], [1.6, 4.7, -1.8]]) {
    const cloud = new THREE.Group(); cloud.position.set(x, y, z); home.add(cloud); clouds.push(cloud);
    sphere(.3, cloudMat, -.28, 0, 0, cloud); sphere(.41, cloudMat, 0, .1, 0, cloud); sphere(.3, cloudMat, .32, 0, 0, cloud);
    cloud.scale.set(1, .63, .7); cloud.traverse(obj => { obj.castShadow = false; });
  }
  const ambient = new THREE.HemisphereLight(0xe5f4ff, 0x8c725d, 2.2); world.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe1b0, 3); sun.position.set(-3, 8, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -5; sun.shadow.camera.right = 5; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -5; sun.shadow.normalBias = .04; world.add(sun);
  let visible = true, disposed = false, lastFrame = 0, pointerX = 0, elapsed = 0, previous = 0;
  const draw = (time = 0) => {
    if (disposed) return;
    const { evening, paused } = getState();
    if (!paused && time) { elapsed += Math.min((time - previous) / 1000 || 0, .05); previous = time; }
    ambient.intensity = evening ? 1.25 : 2.2;
    sun.intensity = evening ? 1.2 : 3; sun.color.set(evening ? 0x9eafff : 0xffe1b0);
    windowMat.color.set(evening ? 0xffd58c : 0xa4d7d8); windowMat.emissive.set(evening ? 0xffa735 : 0x000000); windowMat.emissiveIntensity = .7;
    bulbMat.emissiveIntensity = evening ? 2 : .1; lamp.intensity = evening ? 4 : 0;
    cloudMat.color.set(evening ? 0x8593b0 : 0xffffff);
    if (!paused) {
      home.rotation.y += (pointerX * .18 + Math.sin(elapsed * .25) * .06 - home.rotation.y) * .04;
      trees.forEach((tree, i) => { tree.rotation.z = Math.sin(elapsed * .9 + i) * .025; });
      clouds.forEach((cloud, i) => { cloud.position.x = (i ? 1.6 : -2.7) + Math.sin(elapsed * .3 + i) * .22; });
    }
    renderer.render(world, camera);
  };
  const loop = (time: number) => { if (time - lastFrame < 32) return; lastFrame = time; draw(time); };
  const refresh = () => { if (disposed) return; previous = 0; renderer.setAnimationLoop(visible && !document.hidden && !getState().paused ? loop : null); draw(); };
  const size = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); draw(); };
  const resize = new ResizeObserver(size); resize.observe(host);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; refresh(); }, { threshold: .05 }); intersection.observe(host);
  const move = (event: PointerEvent) => { const bounds = host.getBoundingClientRect(); pointerX = (event.clientX - bounds.left) / bounds.width * 2 - 1; };
  const leave = () => { pointerX = 0; };
  host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave); document.addEventListener('visibilitychange', refresh);
  size(); refresh();
  return { refresh, dispose() {
    disposed = true; renderer.setAnimationLoop(null); resize.disconnect(); intersection.disconnect();
    host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', refresh);
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
  } };
}
