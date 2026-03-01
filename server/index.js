import express from 'express'
import cors from 'cors'
import pg from 'pg'

const { Pool } = pg
const app = express()
const port = process.env.PORT || 3000

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
})

app.use(cors())
app.use(express.json())

app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, email, company, role, interest, message } = req.body || {}
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email required' })
    }
    await pool.query(
      `INSERT INTO waitlist (name, email, company, role, interest, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name?.trim(), email?.trim(), company || null, role || null, interest || null, message || null]
    )
    res.status(201).json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to save' })
  }
})

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(port, () => console.log(`Listening on ${port}`))
