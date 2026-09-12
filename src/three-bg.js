import * as THREE from 'three'

/* ── palette (kept in sync with style.css) ── */
const ORANGE       = 0xf59e0b
const ORANGE_LIGHT = 0xfbbf24
const ORANGE_DEEP  = 0xf97316
const EMBER        = 0x2a1a00

const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const isMobile = () => window.innerWidth < 768

/* ── shared helpers ── */
function makeRenderer(canvas, container) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x000000, 0)
  return renderer
}

function onResize(renderer, camera, container) {
  const w = container.clientWidth
  const h = container.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

/* Render loop that pauses when the canvas is off-screen and
   renders a single frame when the user prefers reduced motion. */
function runLoop(canvas, frame) {
  let running = true
  let visible = true
  let rafId = 0
  const clock = new THREE.Clock()

  function tick() {
    rafId = 0
    if (!running || !visible) return
    frame(clock.getElapsedTime())
    if (!reducedMotion) rafId = requestAnimationFrame(tick)
  }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible && !rafId) tick()
      })
    : null
  io?.observe(canvas)
  tick()

  return () => {
    running = false
    if (rafId) cancelAnimationFrame(rafId)
    io?.disconnect()
  }
}

/* Soft circular point sprite (no hard-edged squares) */
const SOFT_POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 pos = position;
    pos.y += sin(uTime * 0.35 + position.x * 0.7 + position.z) * 0.25;
    pos.x += cos(uTime * 0.25 + position.y * 0.5) * 0.15;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (90.0 / -mv.z);
    vAlpha = aAlpha * (0.75 + 0.25 * sin(uTime * 0.8 + position.x * 3.0));
    gl_Position = projectionMatrix * mv;
  }
`
const SOFT_POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
  }
`

function makeDust({ count, spread, color, opacity, sizeMin, sizeMax, alphaMin = 0.2, alphaMax = 0.7 }) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const alphas = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * spread[0]
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread[1]
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread[2]
    sizes[i]  = sizeMin + Math.random() * (sizeMax - sizeMin)
    alphas[i] = alphaMin + Math.random() * (alphaMax - alphaMin)
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geom.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTime: { value: 0 },
    },
    vertexShader: SOFT_POINT_VERT,
    fragmentShader: SOFT_POINT_FRAG,
  })
  return { points: new THREE.Points(geom, mat), geom, mat }
}

/* ── periodic noise for GLSL ── */
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.-15.)+10.);}

float cnoise(vec3 P){
  vec3 Pi0=floor(P),Pi1=Pi0+vec3(1.);
  Pi0=mod289(Pi0);Pi1=mod289(Pi1);
  vec3 Pf0=fract(P),Pf1=Pf0-vec3(1.);
  vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
  vec4 iy=vec4(Pi0.yy,Pi1.yy);
  vec4 iz0=Pi0.zzzz,iz1=Pi1.zzzz;
  vec4 ixy=permute(permute(ix)+iy);
  vec4 ixy0=permute(ixy+iz0),ixy1=permute(ixy+iz1);
  vec4 gx0=ixy0*(1./7.),gy0=fract(floor(gx0)*(1./7.))-.5;
  gx0=fract(gx0);vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);
  vec4 sz0=step(gz0,vec4(0.));gx0-=sz0*(step(0.,gx0)-.5);gy0-=sz0*(step(0.,gy0)-.5);
  vec4 gx1=ixy1*(1./7.),gy1=fract(floor(gx1)*(1./7.))-.5;
  gx1=fract(gx1);vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);
  vec4 sz1=step(gz1,vec4(0.));gx1-=sz1*(step(0.,gx1)-.5);gy1-=sz1*(step(0.,gy1)-.5);
  vec3 g000=vec3(gx0.x,gy0.x,gz0.x),g100=vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010=vec3(gx0.z,gy0.z,gz0.z),g110=vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001=vec3(gx1.x,gy1.x,gz1.x),g101=vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011=vec3(gx1.z,gy1.z,gz1.z),g111=vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
  vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
  float n000=dot(g000,Pf0),n100=dot(g100,vec3(Pf1.x,Pf0.yz));
  float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)),n110=dot(g110,vec3(Pf1.xy,Pf0.z));
  float n001=dot(g001,vec3(Pf0.xy,Pf1.z)),n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
  float n011=dot(g011,vec3(Pf0.x,Pf1.yz)),n111=dot(g111,Pf1);
  vec3 fade_xyz=fade(Pf0);
  vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
  vec2 n_yz=mix(n_z.xz,n_z.yw,fade_xyz.y);
  return 2.2*mix(n_yz.x,n_yz.y,fade_xyz.x);
}
`

/* Shared terrain displacement so points and grid lines agree exactly */
const TERRAIN_GLSL = /* glsl */ `
  ${NOISE_GLSL}
  uniform float uTime;
  uniform vec2 uMouse;
  float terrain(vec2 p) {
    float s = uTime * 0.22;
    float n = cnoise(vec3(p * 0.09, s)) * 2.4;
    n += cnoise(vec3(p * 0.21 + 3.0, s * 1.4)) * 0.9;
    n += cnoise(vec3(p * 0.55 + 7.0, s * 0.8)) * 0.22;
    vec2 m = (uMouse - 0.5) * vec2(70.0, 46.0);
    float md = length(p - m);
    n += exp(-md * 0.09) * sin(md * 0.55 - uTime * 2.2) * 0.5;
    return n;
  }
  float edgeFade(vec2 p) {
    return (1.0 - smoothstep(18.0, 34.0, abs(p.x))) * (1.0 - smoothstep(10.0, 22.0, abs(p.y)));
  }
`

/* ══════════════════════════════════════════════
   1. HERO — glowing point-field terrain
   ══════════════════════════════════════════════ */
export function initHeroScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200)
  const camBase = new THREE.Vector3(0, 6, 19)
  camera.position.copy(camBase)
  const lookAt = new THREE.Vector3(0, -2, -4)
  camera.lookAt(lookAt)

  const renderer = makeRenderer(canvas, container)
  const pixelRatio = Math.min(window.devicePixelRatio, 2)
  const mobile = isMobile()

  const sharedUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uPixelRatio: { value: pixelRatio },
    uEmber: { value: new THREE.Color(EMBER) },
    uOrange: { value: new THREE.Color(ORANGE) },
    uLight: { value: new THREE.Color(ORANGE_LIGHT) },
    uDeep: { value: new THREE.Color(ORANGE_DEEP) },
  }

  /* dense soft points */
  const pointGeom = new THREE.PlaneGeometry(70, 46, mobile ? 90 : 150, mobile ? 60 : 100)
  const pointMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: sharedUniforms,
    vertexShader: /* glsl */ `
      ${TERRAIN_GLSL}
      uniform float uPixelRatio;
      varying float vH;
      varying float vFog;
      varying float vEdge;
      void main() {
        vec3 pos = position;
        float h = terrain(pos.xy);
        pos.z = h;
        vH = h;
        vEdge = edgeFade(position.xy);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float dist = -mv.z;
        vFog = exp(-max(0.0, dist - 8.0) * 0.05);
        float size = 0.8 + smoothstep(-2.0, 3.0, h) * 1.1;
        gl_PointSize = size * uPixelRatio * (58.0 / dist);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uEmber;
      uniform vec3 uOrange;
      uniform vec3 uLight;
      varying float vH;
      varying float vFog;
      varying float vEdge;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.08, d);
        float t = smoothstep(-2.6, 3.0, vH);
        vec3 col = mix(uEmber, uOrange, t * 0.75);
        col = mix(col, uLight, smoothstep(2.8, 4.4, vH) * 0.35);
        float alpha = a * vFog * vEdge * (0.10 + t * 0.65) * 0.3;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  })
  const pointMesh = new THREE.Points(pointGeom, pointMat)
  pointMesh.rotation.x = -Math.PI / 2
  pointMesh.position.y = -4.5
  scene.add(pointMesh)

  /* sparse structural grid, same displacement */
  const gridGeom = new THREE.PlaneGeometry(70, 46, 40, 26)
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    uniforms: sharedUniforms,
    vertexShader: /* glsl */ `
      ${TERRAIN_GLSL}
      varying float vH;
      varying float vFog;
      varying float vEdge;
      void main() {
        vec3 pos = position;
        pos.z = terrain(pos.xy);
        vH = pos.z;
        vEdge = edgeFade(position.xy);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vFog = exp(-max(0.0, -mv.z - 8.0) * 0.06);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uDeep;
      uniform vec3 uOrange;
      varying float vH;
      varying float vFog;
      varying float vEdge;
      void main() {
        float t = smoothstep(-2.0, 3.5, vH);
        vec3 col = mix(uDeep, uOrange, t);
        gl_FragColor = vec4(col, (0.02 + t * 0.05) * vFog * vEdge);
      }
    `,
  })
  const gridMesh = new THREE.Mesh(gridGeom, gridMat)
  gridMesh.rotation.x = -Math.PI / 2
  gridMesh.position.y = -4.5
  scene.add(gridMesh)

  /* large slow bokeh above the field */
  const bokeh = makeDust({
    count: mobile ? 8 : 14,
    spread: [50, 14, 30],
    color: ORANGE,
    opacity: 0.10,
    sizeMin: 5, sizeMax: 14,
    alphaMin: 0.15, alphaMax: 0.45,
  })
  bokeh.points.position.y = 2
  scene.add(bokeh.points)

  /* fine sparks */
  const sparks = makeDust({
    count: mobile ? 24 : 50,
    spread: [56, 12, 30],
    color: ORANGE_LIGHT,
    opacity: 0.35,
    sizeMin: 0.6, sizeMax: 1.6,
    alphaMin: 0.2, alphaMax: 0.7,
  })
  sparks.points.position.y = 1
  scene.add(sparks.points)

  const mouse = { x: 0.5, y: 0.5 }
  const smooth = { x: 0.5, y: 0.5 }
  const onMove = (e) => {
    const rect = container.getBoundingClientRect()
    mouse.x = (e.clientX - rect.left) / rect.width
    mouse.y = 1 - (e.clientY - rect.top) / rect.height
  }
  const onLeave = () => { mouse.x = 0.5; mouse.y = 0.5 }
  container.addEventListener('mousemove', onMove)
  container.addEventListener('mouseleave', onLeave)

  const stop = runLoop(canvas, (t) => {
    smooth.x += (mouse.x - smooth.x) * 0.04
    smooth.y += (mouse.y - smooth.y) * 0.04
    sharedUniforms.uTime.value = t
    sharedUniforms.uMouse.value.set(smooth.x, smooth.y)
    bokeh.mat.uniforms.uTime.value = t
    sparks.mat.uniforms.uTime.value = t

    camera.position.x = camBase.x + (smooth.x - 0.5) * 2.2
    camera.position.y = camBase.y + (smooth.y - 0.5) * 1.2 + Math.sin(t * 0.18) * 0.25
    camera.lookAt(lookAt)

    renderer.render(scene, camera)
  })

  const resizeHandler = () => onResize(renderer, camera, container)
  window.addEventListener('resize', resizeHandler)

  return {
    destroy() {
      stop()
      window.removeEventListener('resize', resizeHandler)
      container.removeEventListener('mousemove', onMove)
      container.removeEventListener('mouseleave', onLeave)
      renderer.dispose()
      pointGeom.dispose(); pointMat.dispose()
      gridGeom.dispose(); gridMat.dispose()
      bokeh.geom.dispose(); bokeh.mat.dispose()
      sparks.geom.dispose(); sparks.mat.dispose()
    },
  }
}

/* ══════════════════════════════════════════════
   2. GATE — quiet drifting embers, nothing spinning
   ══════════════════════════════════════════════ */
export function initGateScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.set(0, 0, 9)
  camera.lookAt(0, 0, 0)

  const renderer = makeRenderer(canvas, container)
  const mobile = isMobile()

  /* far layer: small, dim, many */
  const far = makeDust({
    count: mobile ? 50 : 110,
    spread: [30, 18, 6],
    color: ORANGE,
    opacity: 0.22,
    sizeMin: 0.5, sizeMax: 1.3,
    alphaMin: 0.2, alphaMax: 0.6,
  })
  far.points.position.z = -4
  scene.add(far.points)

  /* near layer: a few large soft bokeh */
  const near = makeDust({
    count: mobile ? 6 : 12,
    spread: [22, 14, 4],
    color: ORANGE_LIGHT,
    opacity: 0.07,
    sizeMin: 6, sizeMax: 16,
    alphaMin: 0.3, alphaMax: 0.7,
  })
  near.points.position.z = 1
  scene.add(near.points)

  const stop = runLoop(canvas, (t) => {
    far.mat.uniforms.uTime.value = t * 0.6
    near.mat.uniforms.uTime.value = t * 0.4
    far.points.position.y = Math.sin(t * 0.05) * 0.4
    near.points.position.y = Math.cos(t * 0.04) * 0.3
    renderer.render(scene, camera)
  })

  const resizeHandler = () => onResize(renderer, camera, container)
  window.addEventListener('resize', resizeHandler)

  return {
    destroy() {
      stop()
      window.removeEventListener('resize', resizeHandler)
      renderer.dispose()
      far.geom.dispose(); far.mat.dispose()
      near.geom.dispose(); near.mat.dispose()
    },
  }
}

/* ══════════════════════════════════════════════
   3. CTA — same quiet embers as the gate
   ══════════════════════════════════════════════ */
export function initCtaScene(canvas) {
  return initGateScene(canvas)
}
