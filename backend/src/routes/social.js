const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

// ── GET /api/social/profesores ────────────────────────────
// Todos los profesores (para añadir contactos)
router.get('/profesores', (req, res) => {
  const db = getDB()
  const profesores = db.prepare(
    'SELECT id, nombre, apellidos, asignatura, foto FROM profesores WHERE id != ?'
  ).all(req.profesorId)
  res.json(profesores)
})

// ── GET /api/social/contactos ─────────────────────────────
// Mis contactos con el último mensaje
router.get('/contactos', (req, res) => {
  const db = getDB()

  const contactos = db.prepare(`
    SELECT p.id, p.nombre, p.apellidos, p.asignatura, p.foto
    FROM contactos c
    JOIN profesores p ON p.id = c.contacto_id
    WHERE c.profesor_id = ?
    ORDER BY p.nombre
  `).all(req.profesorId)

  // Para cada contacto, añadir el último mensaje
  const result = contactos.map(c => {
    const ultimo = db.prepare(`
      SELECT texto, created_at
      FROM mensajes
      WHERE (de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?)
      ORDER BY created_at DESC
      LIMIT 1
    `).get(req.profesorId, c.id, c.id, req.profesorId)

    return { ...c, ultimo_mensaje: ultimo || null }
  })

  res.json(result)
})

// ── POST /api/social/contactos ────────────────────────────
// Añadir un contacto (mutuo)
router.post('/contactos', (req, res) => {
  const { contacto_id } = req.body
  if (!contacto_id) return res.status(400).json({ error: 'contacto_id requerido' })
  if (contacto_id === req.profesorId) {
    return res.status(400).json({ error: 'No puedes añadirte a ti mismo' })
  }

  const db = getDB()

  // Comprobar que el profesor existe
  const existe = db.prepare('SELECT id FROM profesores WHERE id = ?').get(contacto_id)
  if (!existe) return res.status(404).json({ error: 'Profesor no encontrado' })

  // Insertar ambas direcciones (ignorar si ya existe)
  const ins = db.prepare(
    'INSERT OR IGNORE INTO contactos (profesor_id, contacto_id) VALUES (?, ?)'
  )
  ins.run(req.profesorId, contacto_id)
  ins.run(contacto_id, req.profesorId)

  res.status(201).json({ ok: true })
})

// ── DELETE /api/social/contactos/:id ─────────────────────
router.delete('/contactos/:id', (req, res) => {
  const db = getDB()
  db.prepare(
    'DELETE FROM contactos WHERE (profesor_id = ? AND contacto_id = ?) OR (profesor_id = ? AND contacto_id = ?)'
  ).run(req.profesorId, req.params.id, req.params.id, req.profesorId)
  res.json({ ok: true })
})

// ── GET /api/social/mensajes/:contactoId ──────────────────
// Historial de mensajes con un contacto
router.get('/mensajes/:contactoId', (req, res) => {
  const db = getDB()
  const mensajes = db.prepare(`
    SELECT m.*, p.nombre as de_nombre
    FROM mensajes m
    JOIN profesores p ON p.id = m.de_id
    WHERE (m.de_id = ? AND m.para_id = ?)
       OR (m.de_id = ? AND m.para_id = ?)
    ORDER BY m.created_at ASC
  `).all(req.profesorId, req.params.contactoId, req.params.contactoId, req.profesorId)

  res.json(mensajes)
})

// ── POST /api/social/mensajes ─────────────────────────────
router.post('/mensajes', (req, res) => {
  const { para_id, texto } = req.body
  if (!para_id || !texto?.trim()) {
    return res.status(400).json({ error: 'para_id y texto son obligatorios' })
  }

  const db = getDB()
  const result = db.prepare(
    'INSERT INTO mensajes (de_id, para_id, texto) VALUES (?, ?, ?)'
  ).run(req.profesorId, para_id, texto.trim())

  const msg = db.prepare('SELECT * FROM mensajes WHERE id = ?').get(result.lastInsertRowid)

  // Notificar al destinatario
  const remitente = db.prepare('SELECT nombre, apellidos FROM profesores WHERE id = ?').get(req.profesorId)
  if (remitente) {
    db.prepare('INSERT INTO notificaciones (profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?)')
      .run(para_id, 'mensaje',
        `Mensaje de ${remitente.nombre} ${remitente.apellidos}`,
        texto.trim().length > 60 ? texto.trim().slice(0, 60) + '...' : texto.trim()
      )
  }

  res.status(201).json(msg)
})

module.exports = router