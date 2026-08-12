import './style.css'
import {
  initHeroScene, initGateScene, initCtaScene,
  initProblemScene, initPlatformScene, initHowScene, initUseCasesScene,
} from './three-bg.js'

// Three.js scenes
let gateScene = null
let heroScene = null
let ctaScene = null
const sectionScenes = []

gateScene = initGateScene(document.getElementById('gate-canvas'))

// Stealth gate
const ACCESS_CODE = 'Guavion-0987'
const gate = document.getElementById('stealth-gate')
const gateInput = document.getElementById('gate-input')
const gateBtn = document.getElementById('gate-btn')
const gateError = document.getElementById('gate-error')

function initSectionScenes() {
  const configs = [
    { id: 'problem-canvas', init: initProblemScene, section: '#problem' },
    { id: 'platform-canvas', init: initPlatformScene, section: '#platform' },
    { id: 'how-canvas', init: initHowScene, section: '#how' },
    { id: 'usecases-canvas', init: initUseCasesScene, section: '#use-cases' },
  ]

  configs.forEach(({ id, init, section }) => {
    const canvas = document.getElementById(id)
    const sectionEl = document.querySelector(section)
    if (!canvas || !sectionEl) return
    const scene = init(canvas)
    if (scene) {
      scene.setVisible(false)
      sectionScenes.push({ scene, el: sectionEl })
    }
  })

  if (sectionScenes.length && 'IntersectionObserver' in window) {
    const visObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const match = sectionScenes.find((s) => s.el === entry.target)
        if (match) match.scene.setVisible(entry.isIntersecting)
      })
    }, { threshold: 0.05 })
    sectionScenes.forEach(({ el }) => visObs.observe(el))
  } else {
    sectionScenes.forEach(({ scene }) => scene.setVisible(true))
  }
}

function unlockSite() {
  gate?.classList.add('hidden')
  document.body.classList.remove('gated')
  sessionStorage.setItem('guavion_access', '1')
  if (gateScene) { gateScene.destroy(); gateScene = null }
  if (!heroScene) heroScene = initHeroScene(document.getElementById('hero-canvas'))
  if (!ctaScene) ctaScene = initCtaScene(document.getElementById('cta-canvas'))
  initSectionScenes()
}

if (sessionStorage.getItem('guavion_access') === '1') {
  unlockSite()
} else {
  document.body.classList.add('gated')
}

function tryAccess() {
  if (gateInput?.value === ACCESS_CODE) {
    unlockSite()
  } else {
    if (gateError) { gateError.hidden = false }
    gateInput?.focus()
  }
}

gateBtn?.addEventListener('click', tryAccess)
gateInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryAccess()
})

// Mobile menu
const toggle = document.querySelector('.header__toggle')
const nav = document.querySelector('.header__nav')

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open')
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : ''
  })
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open')
      document.body.style.overflow = ''
    })
  })
}

// Scroll reveal with IntersectionObserver
const reveals = document.querySelectorAll('.reveal')
if (reveals.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80)
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })

  reveals.forEach(el => observer.observe(el))
} else {
  reveals.forEach(el => el.classList.add('visible'))
}

// Header shrink on scroll
const header = document.querySelector('.header')
if (header) {
  let ticking = false
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.style.borderBottomColor = window.scrollY > 20
          ? 'rgba(255,255,255,.08)'
          : 'rgba(255,255,255,.04)'
        ticking = false
      })
      ticking = true
    }
  })
}

// Waitlist form
const API_URL = import.meta.env.VITE_API_URL || ''
const form = document.getElementById('waitlist-form')
const msg = document.getElementById('waitlist-message')
const submitBtn = form?.querySelector('button[type="submit"]')

if (form && msg) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = form.querySelector('input[name="name"]')?.value?.trim()
    const email = form.querySelector('input[name="email"]')?.value?.trim()
    if (!email || !name) return

    const payload = {
      name,
      email,
      company: form.querySelector('input[name="company"]')?.value?.trim() || null,
      role: form.querySelector('input[name="role"]')?.value?.trim() || null,
      interest: form.querySelector('select[name="interest"]')?.value || null,
      message: form.querySelector('textarea[name="message"]')?.value?.trim() || null,
    }

    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Sending…'
    }

    try {
      if (API_URL) {
        const res = await fetch(`${API_URL.replace(/\/$/, '')}/api/waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(res.statusText || 'Request failed')
      }

      msg.hidden = false
      msg.textContent = "Thanks! We'll be in touch."
      msg.className = 'form__msg ok'
      form.reset()
    } catch (err) {
      msg.hidden = false
      msg.textContent = 'Something went wrong. Please try again.'
      msg.className = 'form__msg err'
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Join waitlist'
      }
    }
  })
}
