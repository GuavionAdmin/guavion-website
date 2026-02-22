import './style.css'

const toggle = document.querySelector('.header__toggle')
const nav = document.querySelector('.header__nav')

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open')
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : ''
  })
}

const form = document.getElementById('waitlist-form')
const msg = document.getElementById('waitlist-message')

if (form && msg) {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const email = form.querySelector('input[name="email"]')?.value?.trim()
    const name = form.querySelector('input[name="name"]')?.value?.trim()
    if (!email || !name) return

    msg.hidden = false
    msg.textContent = "Thanks! We'll be in touch."
    msg.className = 'form__msg ok'
    form.reset()
  })
}
