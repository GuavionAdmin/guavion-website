import * as THREE from 'three'

function onResize(renderer, camera, container) {
  const w = container.clientWidth
  const h = container.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function isMobile() {
  return window.innerWidth < 768
}

/* ── simplex-style noise for GLSL ── */
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

/* ══════════════════════════════════════════════
   1. HERO — flowing wave terrain with custom shaders
   ══════════════════════════════════════════════ */
export function initHeroScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x06080e, 0.028)

  const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.set(0, 8, 18)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x000000, 0)

  const segments = isMobile() ? 80 : 160
  const planeGeom = new THREE.PlaneGeometry(60, 40, segments, segments)

  const waveMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    wireframe: true,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAmber: { value: new THREE.Color(0xf59e0b) },
      uAmberLight: { value: new THREE.Color(0xfbbf24) },
      uDark: { value: new THREE.Color(0x1a1000) },
      uOpacity: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uTime;
      uniform vec2 uMouse;
      varying float vHeight;
      varying float vDist;

      void main() {
        vec3 pos = position;

        float slow = uTime * 0.3;
        float n1 = cnoise(vec3(pos.x * 0.12, pos.y * 0.12, slow)) * 2.5;
        float n2 = cnoise(vec3(pos.x * 0.25 + 3.0, pos.y * 0.25, slow * 1.3)) * 1.2;
        float n3 = cnoise(vec3(pos.x * 0.5 + 7.0, pos.y * 0.5, slow * 0.7)) * 0.4;

        float mouseX = (uMouse.x - 0.5) * 60.0;
        float mouseY = (uMouse.y - 0.5) * 40.0;
        float mouseDist = length(vec2(pos.x - mouseX, pos.y - mouseY));
        float mouseWave = exp(-mouseDist * 0.08) * sin(mouseDist * 0.5 - uTime * 2.0) * 1.5;

        pos.z = n1 + n2 + n3 + mouseWave;
        vHeight = pos.z;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vDist = -mvPos.z;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uAmber;
      uniform vec3 uAmberLight;
      uniform vec3 uDark;
      uniform float uOpacity;
      varying float vHeight;
      varying float vDist;

      void main() {
        float h = smoothstep(-3.0, 4.0, vHeight);
        vec3 col = mix(uDark, uAmber, h * 0.7);
        col = mix(col, uAmberLight, smoothstep(2.5, 4.5, vHeight) * 0.6);

        float fog = exp(-vDist * 0.04);
        col *= fog;

        float alpha = uOpacity * fog * (0.3 + h * 0.7);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  })

  const waveMesh = new THREE.Mesh(planeGeom, waveMat)
  waveMesh.rotation.x = -Math.PI * 0.42
  waveMesh.position.y = -4
  scene.add(waveMesh)

  // sparse floating particles above the wave
  const pCount = isMobile() ? 40 : 90
  const pPositions = new Float32Array(pCount * 3)
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 50
    pPositions[i * 3 + 1] = Math.random() * 12 - 2
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 30
  }
  const pGeom = new THREE.BufferGeometry()
  pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3))
  const pMat = new THREE.PointsMaterial({
    color: 0xfbbf24,
    size: 0.08,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const particles = new THREE.Points(pGeom, pMat)
  scene.add(particles)

  const mouse = { x: 0.5, y: 0.5 }
  const smoothMouse = { x: 0.5, y: 0.5 }

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect()
    mouse.x = (e.clientX - rect.left) / rect.width
    mouse.y = 1 - (e.clientY - rect.top) / rect.height
  })

  let running = true
  const clock = new THREE.Clock()

  function animate() {
    if (!running) return

    const t = clock.getElapsedTime()
    waveMat.uniforms.uTime.value = t

    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.05
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.05
    waveMat.uniforms.uMouse.value.set(smoothMouse.x, smoothMouse.y)

    // gentle particle drift
    const pp = pGeom.attributes.position.array
    for (let i = 0; i < pCount; i++) {
      pp[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.003
      pp[i * 3] += Math.cos(t * 0.3 + i * 0.7) * 0.002
    }
    pGeom.attributes.position.needsUpdate = true

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }

  const resizeHandler = () => onResize(renderer, camera, container)
  window.addEventListener('resize', resizeHandler)
  animate()

  return {
    destroy() {
      running = false
      window.removeEventListener('resize', resizeHandler)
      renderer.dispose()
      planeGeom.dispose()
      waveMat.dispose()
      pGeom.dispose()
      pMat.dispose()
    },
  }
}

/* ══════════════════════════════════════════════
   2. GATE — morphing wireframe sphere
   ══════════════════════════════════════════════ */
export function initGateScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.z = 5

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x000000, 0)

  const detail = isMobile() ? 3 : 4
  const sphereGeom = new THREE.IcosahedronGeometry(1.8, detail)
  const originalPositions = new Float32Array(sphereGeom.attributes.position.array)

  const sphereMat = new THREE.ShaderMaterial({
    transparent: true,
    wireframe: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xf59e0b) },
    },
    vertexShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform float uTime;
      attribute vec3 basePosition;
      varying float vNoise;

      void main() {
        vec3 pos = position;
        float n = cnoise(pos * 0.8 + uTime * 0.2) * 0.4;
        n += cnoise(pos * 1.6 + uTime * 0.3) * 0.15;
        pos += normal * n;
        vNoise = n;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vNoise;

      void main() {
        float brightness = 0.3 + smoothstep(-0.3, 0.5, vNoise) * 0.5;
        gl_FragColor = vec4(uColor * brightness, 0.25 + brightness * 0.15);
      }
    `,
  })

  const sphere = new THREE.Mesh(sphereGeom, sphereMat)
  scene.add(sphere)

  // faint outer glow
  const glowGeom = new THREE.SphereGeometry(2.6, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.03,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Mesh(glowGeom, glowMat)
  scene.add(glow)

  let running = true
  const clock = new THREE.Clock()

  function animate() {
    if (!running) return

    const t = clock.getElapsedTime()
    sphereMat.uniforms.uTime.value = t
    sphere.rotation.y = t * 0.1
    sphere.rotation.x = Math.sin(t * 0.08) * 0.3
    glow.scale.setScalar(1 + Math.sin(t * 0.6) * 0.08)
    glowMat.opacity = 0.02 + Math.sin(t * 0.4) * 0.015

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }

  const resizeHandler = () => onResize(renderer, camera, container)
  window.addEventListener('resize', resizeHandler)
  animate()

  return {
    destroy() {
      running = false
      window.removeEventListener('resize', resizeHandler)
      renderer.dispose()
      sphereGeom.dispose()
      sphereMat.dispose()
      glowGeom.dispose()
      glowMat.dispose()
    },
  }
}

/* ══════════════════════════════════════════════
   3. CTA — orbital ring system
   ══════════════════════════════════════════════ */
export function initCtaScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.set(0, 2, 6)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x000000, 0)

  const group = new THREE.Group()
  scene.add(group)

  const ringCount = 3
  const ringColors = [0xf59e0b, 0xfbbf24, 0x4f8aff]
  const rings = []

  for (let r = 0; r < ringCount; r++) {
    const radius = 1.6 + r * 0.5
    const tubeGeom = new THREE.TorusGeometry(radius, 0.008, 8, 128)
    const tubeMat = new THREE.MeshBasicMaterial({
      color: ringColors[r],
      transparent: true,
      opacity: 0.3 - r * 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const torus = new THREE.Mesh(tubeGeom, tubeMat)
    torus.rotation.x = Math.PI * 0.5 + (r - 1) * 0.35
    torus.rotation.z = r * 0.4
    group.add(torus)
    rings.push({ mesh: torus, mat: tubeMat, geom: tubeGeom, speed: 0.15 + r * 0.08, offset: r * 1.2 })
  }

  // orbital particles on rings
  const orbCount = isMobile() ? 30 : 60
  const orbPositions = new Float32Array(orbCount * 3)
  const orbAngles = new Float32Array(orbCount)
  const orbRings = new Uint8Array(orbCount)
  const orbSpeeds = new Float32Array(orbCount)

  for (let i = 0; i < orbCount; i++) {
    const ringIdx = i % ringCount
    orbRings[i] = ringIdx
    orbAngles[i] = Math.random() * Math.PI * 2
    orbSpeeds[i] = 0.2 + Math.random() * 0.3
  }

  const orbGeom = new THREE.BufferGeometry()
  orbGeom.setAttribute('position', new THREE.BufferAttribute(orbPositions, 3))

  const orbMat = new THREE.PointsMaterial({
    color: 0xfbbf24,
    size: 0.06,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const orbPoints = new THREE.Points(orbGeom, orbMat)
  group.add(orbPoints)

  // center core
  const coreGeom = new THREE.IcosahedronGeometry(0.5, 2)
  const coreMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xf59e0b) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;
        pos += normal * sin(uTime * 2.0 + position.y * 4.0) * 0.03;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec3 vNormal;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
        float pulse = 0.5 + sin(uTime * 1.5) * 0.2;
        vec3 col = uColor * (0.3 + fresnel * 0.8);
        gl_FragColor = vec4(col, (0.15 + fresnel * 0.3) * pulse);
      }
    `,
  })
  const core = new THREE.Mesh(coreGeom, coreMat)
  group.add(core)

  // core glow
  const coreGlowGeom = new THREE.SphereGeometry(1.0, 32, 32)
  const coreGlowMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.04,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const coreGlow = new THREE.Mesh(coreGlowGeom, coreGlowMat)
  group.add(coreGlow)

  let running = true
  const clock = new THREE.Clock()

  function animate() {
    if (!running) return

    const t = clock.getElapsedTime()
    coreMat.uniforms.uTime.value = t

    group.rotation.y = t * 0.08
    group.rotation.x = Math.sin(t * 0.1) * 0.15

    rings.forEach(({ mesh, mat, speed, offset }) => {
      mesh.rotation.z += speed * 0.003
      mat.opacity = 0.2 + Math.sin(t * 0.5 + offset) * 0.1
    })

    const pp = orbGeom.attributes.position.array
    for (let i = 0; i < orbCount; i++) {
      const ringIdx = orbRings[i]
      const radius = 1.6 + ringIdx * 0.5
      orbAngles[i] += orbSpeeds[i] * 0.008
      const a = orbAngles[i]
      const tiltX = Math.PI * 0.5 + (ringIdx - 1) * 0.35
      const tiltZ = ringIdx * 0.4

      let x = Math.cos(a) * radius
      let y = Math.sin(a) * radius
      let z = 0

      const cx = Math.cos(tiltX), sx = Math.sin(tiltX)
      const y2 = y * cx - z * sx
      const z2 = y * sx + z * cx
      y = y2; z = z2

      const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ)
      const x2 = x * cz - y * sz
      const y3 = x * sz + y * cz

      pp[i * 3] = x2
      pp[i * 3 + 1] = y3
      pp[i * 3 + 2] = z
    }
    orbGeom.attributes.position.needsUpdate = true

    coreGlow.scale.setScalar(1 + Math.sin(t * 0.8) * 0.1)
    coreGlowMat.opacity = 0.03 + Math.sin(t * 0.6) * 0.015

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }

  const resizeHandler = () => onResize(renderer, camera, container)
  window.addEventListener('resize', resizeHandler)
  animate()

  return {
    destroy() {
      running = false
      window.removeEventListener('resize', resizeHandler)
      renderer.dispose()
      rings.forEach(({ geom, mat }) => { geom.dispose(); mat.dispose() })
      orbGeom.dispose(); orbMat.dispose()
      coreGeom.dispose(); coreMat.dispose()
      coreGlowGeom.dispose(); coreGlowMat.dispose()
    },
  }
}
