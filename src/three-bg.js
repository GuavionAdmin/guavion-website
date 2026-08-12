import * as THREE from 'three'

const AMBER = new THREE.Color(0xf59e0b)
const BLUE_DIM = new THREE.Color(0x4f8aff)

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

function createCircleTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/* ══════════════════════════════════════════════
   1.  HERO — subtle particle network
   ══════════════════════════════════════════════ */
export function initHeroScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200)
  camera.position.z = 50

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)

  const PARTICLE_COUNT = isMobile() ? 60 : 120
  const CONNECTION_DIST = 6
  const MOUSE_INFLUENCE = 12
  const spreadX = 50
  const spreadY = 30

  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const velocities = []
  const dotTexture = createCircleTexture()

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spreadX * 2
    positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY * 2
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.005
      )
    )
  }

  const particleGeom = new THREE.BufferGeometry()
  particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const particleMat = new THREE.PointsMaterial({
    color: AMBER,
    size: 0.6,
    map: dotTexture,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(particleGeom, particleMat)
  scene.add(points)

  const maxLines = PARTICLE_COUNT * 4
  const linePositions = new Float32Array(maxLines * 6)
  const lineColors = new Float32Array(maxLines * 6)
  const lineGeom = new THREE.BufferGeometry()
  lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  lineGeom.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const lines = new THREE.LineSegments(lineGeom, lineMat)
  scene.add(lines)

  const mouse = new THREE.Vector2(9999, 9999)
  const mouse3D = new THREE.Vector3(9999, 9999, 0)
  const raycaster = new THREE.Raycaster()

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    raycaster.ray.intersectPlane(plane, mouse3D)
  })

  container.addEventListener('mouseleave', () => {
    mouse3D.set(9999, 9999, 0)
  })

  let running = true

  function animate() {
    if (!running) return
    const pos = particleGeom.attributes.position.array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3

      pos[ix] += velocities[i].x
      pos[ix + 1] += velocities[i].y
      pos[ix + 2] += velocities[i].z

      if (Math.abs(pos[ix]) > spreadX) velocities[i].x *= -1
      if (Math.abs(pos[ix + 1]) > spreadY) velocities[i].y *= -1
      if (Math.abs(pos[ix + 2]) > 10) velocities[i].z *= -1

      const dx = mouse3D.x - pos[ix]
      const dy = mouse3D.y - pos[ix + 1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MOUSE_INFLUENCE && dist > 0.1) {
        const force = (MOUSE_INFLUENCE - dist) / MOUSE_INFLUENCE * 0.002
        pos[ix] += dx * force
        pos[ix + 1] += dy * force
      }
    }

    particleGeom.attributes.position.needsUpdate = true

    let lineIdx = 0
    const lp = lineGeom.attributes.position.array
    const lc = lineGeom.attributes.color.array

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        if (lineIdx >= maxLines) break
        const ix = i * 3, jx = j * 3
        const ddx = pos[ix] - pos[jx]
        const ddy = pos[ix + 1] - pos[jx + 1]
        const ddz = pos[ix + 2] - pos[jx + 2]
        const d = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz)

        if (d < CONNECTION_DIST) {
          const alpha = (1 - d / CONNECTION_DIST) * 0.5
          const base = lineIdx * 6
          lp[base] = pos[ix]; lp[base + 1] = pos[ix + 1]; lp[base + 2] = pos[ix + 2]
          lp[base + 3] = pos[jx]; lp[base + 4] = pos[jx + 1]; lp[base + 5] = pos[jx + 2]

          lc[base] = AMBER.r * alpha; lc[base + 1] = AMBER.g * alpha; lc[base + 2] = AMBER.b * alpha
          lc[base + 3] = AMBER.r * alpha; lc[base + 4] = AMBER.g * alpha; lc[base + 5] = AMBER.b * alpha
          lineIdx++
        }
      }
    }

    for (let i = lineIdx * 6; i < lp.length; i++) {
      lp[i] = 0; lc[i] = 0
    }

    lineGeom.attributes.position.needsUpdate = true
    lineGeom.attributes.color.needsUpdate = true
    lineGeom.setDrawRange(0, lineIdx * 2)

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
      particleGeom.dispose()
      particleMat.dispose()
      dotTexture.dispose()
      lineGeom.dispose()
      lineMat.dispose()
    },
  }
}

/* ══════════════════════════════════════════════
   2.  GATE — subtle floating particles
   ══════════════════════════════════════════════ */
export function initGateScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.z = 30

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)

  const COUNT = isMobile() ? 30 : 60
  const dotTexture = createCircleTexture()
  const positions = new Float32Array(COUNT * 3)
  const phases = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15
    phases[i] = Math.random() * Math.PI * 2
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: AMBER,
    size: 0.5,
    map: dotTexture,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const pts = new THREE.Points(geom, mat)
  scene.add(pts)

  let running = true

  function animate() {
    if (!running) return

    const t = performance.now() * 0.001
    const pos = geom.attributes.position.array

    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3
      pos[ix + 1] += Math.sin(t + phases[i]) * 0.003
      pos[ix] += Math.cos(t * 0.7 + phases[i]) * 0.002
    }

    geom.attributes.position.needsUpdate = true
    mat.opacity = 0.2 + Math.sin(t * 0.5) * 0.08

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
      geom.dispose()
      mat.dispose()
      dotTexture.dispose()
    },
  }
}

/* ══════════════════════════════════════════════
   3.  CTA — glowing wireframe orb
   ══════════════════════════════════════════════ */
export function initCtaScene(canvas) {
  if (!canvas) return null

  const container = canvas.parentElement
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
  camera.position.z = 6

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)

  const torusGeom = new THREE.TorusKnotGeometry(1.6, 0.5, 128, 32, 2, 3)
  const torusEdges = new THREE.EdgesGeometry(torusGeom, 15)

  const torusMat = new THREE.LineBasicMaterial({
    color: AMBER,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
  })

  const torusLines = new THREE.LineSegments(torusEdges, torusMat)
  scene.add(torusLines)

  const innerGeom = new THREE.IcosahedronGeometry(1.2, 1)
  const innerEdges = new THREE.EdgesGeometry(innerGeom)
  const innerMat = new THREE.LineBasicMaterial({
    color: BLUE_DIM,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
  })
  const innerLines = new THREE.LineSegments(innerEdges, innerMat)
  scene.add(innerLines)

  const glowGeom = new THREE.SphereGeometry(2.2, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: AMBER,
    transparent: true,
    opacity: 0.025,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Mesh(glowGeom, glowMat)
  scene.add(glow)

  let running = true

  function animate() {
    if (!running) return

    const t = performance.now() * 0.001

    torusLines.rotation.x = t * 0.12
    torusLines.rotation.y = t * 0.16
    torusMat.opacity = 0.1 + Math.sin(t * 0.8) * 0.05

    innerLines.rotation.x = -t * 0.08
    innerLines.rotation.y = -t * 0.12
    innerMat.opacity = 0.08 + Math.sin(t * 0.6 + 1) * 0.04

    glow.scale.setScalar(1 + Math.sin(t) * 0.05)
    glowMat.opacity = 0.02 + Math.sin(t * 0.5) * 0.01

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
      torusGeom.dispose(); torusEdges.dispose(); torusMat.dispose()
      innerGeom.dispose(); innerEdges.dispose(); innerMat.dispose()
      glowGeom.dispose(); glowMat.dispose()
    },
  }
}
