process.on('uncaughtException', (err) => {
  console.error('ERROR NO CAPTURADO:', err)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  console.error('PROMESA RECHAZADA:', err)
  process.exit(1)
})

const express = require('express')
const cors    = require('cors')
const path    = require('path')
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
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

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: '*', credentials: false }))
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

app.get('/api/health', (req, res) => res.json({ ok: true }))

initDB()
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  EduRooms backend corriendo en http://localhost:${PORT}`)
})

