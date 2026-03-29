const express = require('express')
const bcrypt  = require('bcryptjs')
const { getDB } = require('../config/database')
const { generarToken, verificarToken } = require('../middleware/auth')

const router = express.Router()

// ── GET /api/auth/centros ─────────────────────────────────
// Lista de centros disponibles para el registro de profesores
router.get('/centros', (req, res) => {
  const db = getDB()
  const centros = db.prepare(
    'SELECT id, nombre, codigo, ciudad, provincia FROM centros ORDER BY nombre'
  ).all()
  res.json(centros)
})

// ── POST /api/auth/centro ─────────────────────────────────
// El director registra su centro y su cuenta a la vez
router.post('/centro', (req, res) => {
  const { centro_nombre, centro_codigo, centro_ciudad, centro_provincia,
          nombre, apellidos, email, password } = req.body

  if (!centro_nombre || !centro_codigo || !nombre || !apellidos || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }

  const db = getDB()

  // Verificar que el código del centro no existe
  const existeCodigo = db.prepare('SELECT id FROM centros WHERE codigo = ?').get(centro_codigo.toUpperCase())
  if (existeCodigo) return res.status(409).json({ error: 'Ya existe un centro con ese código' })

  // Verificar que el email no existe
  const existeEmail = db.prepare('SELECT id FROM profesores WHERE email = ?').get(email)
  if (existeEmail) return res.status(409).json({ error: 'Este correo ya está registrado' })

  // Crear centro
  const centroResult = db.prepare(
    'INSERT INTO centros (nombre, codigo, ciudad, provincia) VALUES (?, ?, ?, ?)'
  ).run(centro_nombre.trim(), centro_codigo.toUpperCase().trim(), centro_ciudad?.trim() || '', centro_provincia?.trim() || '')

  const centroId = centroResult.lastInsertRowid

  // Crear cuenta director — aprobada automáticamente
  const hash = bcrypt.hashSync(password, 10)
  db.prepare(`
    INSERT INTO profesores (centro_id, nombre, apellidos, email, password, asignatura, rol, aprobado)
    VALUES (?, ?, ?, ?, ?, 'Dirección', 'director', 1)
  `).run(centroId, nombre.trim(), apellidos.trim(), email, hash)

  const director = db.prepare('SELECT * FROM profesores WHERE email = ?').get(email)
  const token    = generarToken(director)
  const { password: _, ...safe } = director

  res.status(201).json({ token, profesor: safe })
})

// ── POST /api/auth/registro ───────────────────────────────
router.post('/registro', (req, res) => {
  const { nombre, apellidos, email, password, asignatura, centro_id } = req.body

  if (!nombre || !apellidos || !email || !password || !asignatura || !centro_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' })
  }

  const db = getDB()

  const centro = db.prepare('SELECT id FROM centros WHERE id = ?').get(centro_id)
  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  const existe = db.prepare('SELECT id FROM profesores WHERE email = ?').get(email)
  if (existe) return res.status(409).json({ error: 'Este correo ya está registrado' })

  const hash = bcrypt.hashSync(password, 10)
  db.prepare(`
    INSERT INTO profesores (centro_id, nombre, apellidos, email, password, asignatura, rol, aprobado)
    VALUES (?, ?, ?, ?, ?, ?, 'profesor', 0)
  `).run(centro_id, nombre, apellidos, email, hash, asignatura)

  res.status(201).json({ pendiente: true, mensaje: 'Cuenta creada. Espera a que el director apruebe tu acceso.' })
})

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' })

  const db      = getDB()
  const profesor = db.prepare('SELECT * FROM profesores WHERE email = ?').get(email)
  if (!profesor) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const ok = bcrypt.compareSync(password, profesor.password)
  if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' })

  if (profesor.aprobado === 0)
    return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por el director.' })
  if (profesor.aprobado === 2)
    return res.status(403).json({ error: 'Tu cuenta ha sido rechazada. Contacta con el director.' })

  const token = generarToken(profesor)
  const { password: _, ...safe } = profesor
  res.json({ token, profesor: safe })
})

// ── GET /api/auth/me ──────────────────────────────────────
router.get('/me', verificarToken, (req, res) => {
  const db      = getDB()
  const profesor = db.prepare(`
    SELECT p.id, p.nombre, p.apellidos, p.email, p.asignatura, p.foto,
           p.rol, p.aprobado, p.centro_id, p.created_at,
           c.nombre as centro_nombre, c.codigo as centro_codigo, c.logo as centro_logo
    FROM profesores p
    LEFT JOIN centros c ON c.id = p.centro_id
    WHERE p.id = ?
  `).get(req.profesorId)
  if (!profesor) return res.status(404).json({ error: 'No encontrado' })
  res.json(profesor)
})

module.exports = router