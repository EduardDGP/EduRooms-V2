const express = require('express')
const cors    = require('cors')
const path    = require('path')
const { initDB } = require('./config/database')

const authRoutes    = require('./routes/auth')
const aulasRoutes   = require('./routes/aulas')
const reservasRoutes= require('./routes/reservas')
const socialRoutes  = require('./routes/social')
const perfilRoutes  = require('./routes/perfil')
const banoRoutes    = require('./routes/bano')
const adminRoutes   = require('./routes/admin')
const alumnosRoutes       = require('./routes/alumnos')
const notificacionesRoutes= require('./routes/notificaciones')
const guardiasRoutes      = require('./routes/guardias')
const superadminRoutes    = require('./routes/superadmin')
const stripeRoutes        = require('./routes/stripe')

const app  = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
// Webhook de Stripe ANTES del middleware JSON
app.use('/api/stripe/webhook', stripeRoutes)

app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth',    authRoutes)
app.use('/api/aulas',   aulasRoutes)
app.use('/api/reservas',reservasRoutes)
app.use('/api/social',  socialRoutes)
app.use('/api/perfil',  perfilRoutes)
app.use('/api/bano',    banoRoutes)
app.use('/api/admin',   adminRoutes)
app.use('/api/alumnos',        alumnosRoutes)
app.use('/api/notificaciones', notificacionesRoutes)
app.use('/api/guardias',       guardiasRoutes)
app.use('/api/superadmin',    superadminRoutes)
app.use('/api/stripe',        stripeRoutes)

app.get('/api/health', (req, res) => res.json({ ok: true }))

initDB()
app.listen(PORT, () => {
  console.log(`✅  EduRooms backend corriendo en http://localhost:${PORT}`)
})