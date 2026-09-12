import './style.css'
import { initHeroScene, initGateScene, initCtaScene } from './three-bg.js'

// Three.js scenes
let gateScene = null
let heroScene = null
let ctaScene = null

gateScene = initGateScene(document.getElementById('gate-canvas'))

// Stealth gate
const ACCESS_CODE = 'Guavion-0987'
const gate = document.getElementById('stealth-gate')
const gateInput = document.getElementById('gate-input')
const gateBtn = document.getElementById('gate-btn')
const gateError = document.getElementById('gate-error')

function unlockSite() {
  gate?.classList.add('hidden')
  document.body.classList.remove('gated')
  sessionStorage.setItem('guavion_access', '1')
  if (gateScene) { gateScene.destroy(); gateScene = null }
  if (!heroScene) heroScene = initHeroScene(document.getElementById('hero-canvas'))
  if (!ctaScene) ctaScene = initCtaScene(document.getElementById('cta-canvas'))
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

// Header state on scroll
const header = document.querySelector('.header')
if (header) {
  let ticking = false
  const update = () => {
    header.classList.toggle('scrolled', window.scrollY > 20)
    ticking = false
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true }
  }, { passive: true })
  update()
}

// Card cursor spotlight (sets --mx/--my used by .card::after)
const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
if (finePointer) {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
    })
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
