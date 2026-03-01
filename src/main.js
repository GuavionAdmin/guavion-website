import './style.css'

const toggle = document.querySelector('.header__toggle')
const nav = document.querySelector('.header__nav')

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open')
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : ''
  })
}

// Backend API URL (set in production via VITE_API_URL, e.g. your Railway backend)
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
      msg.textContent = 'Something went wrong. Please try again or contact us directly.'
      msg.className = 'form__msg err'
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Join waitlist'
      }
    }
  })
}
