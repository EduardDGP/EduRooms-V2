const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

router.get('/profesores', (req, res) => {
  const db = getDB()
  const profesores = db.prepare(
    'SELECT id, nombre, apellidos, asignatura, foto, rol FROM profesores WHERE id != ? AND centro_id = ? AND aprobado = 1'
  ).all(req.profesorId, req.centroId)
  res.json(profesores)
})

router.get('/contactos', (req, res) => {
  const db       = getDB()
  const contactos = db.prepare(`
    SELECT p.id, p.nombre, p.apellidos, p.asignatura, p.foto
    FROM contactos c JOIN profesores p ON p.id = c.contacto_id
    WHERE c.profesor_id = ?
    ORDER BY p.nombre
  `).all(req.profesorId)

  const result = contactos.map(c => {
    const ultimo = db.prepare(`
      SELECT texto, created_at FROM mensajes
      WHERE (de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `).get(req.profesorId, c.id, c.id, req.profesorId)
    return { ...c, ultimo_mensaje: ultimo || null }
  })
  res.json(result)
})

router.post('/contactos', (req, res) => {
  const { contacto_id } = req.body
  if (!contacto_id) return res.status(400).json({ error: 'contacto_id requerido' })
  if (contacto_id === req.profesorId) return res.status(400).json({ error: 'No puedes añadirte a ti mismo' })

  const db    = getDB()
  const existe = db.prepare('SELECT id FROM profesores WHERE id = ? AND centro_id = ?').get(contacto_id, req.centroId)
  if (!existe) return res.status(404).json({ error: 'Profesor no encontrado' })

  const ins = db.prepare('INSERT OR IGNORE INTO contactos (profesor_id, contacto_id) VALUES (?, ?)')
  ins.run(req.profesorId, contacto_id)
  ins.run(contacto_id, req.profesorId)
  res.status(201).json({ ok: true })
})

router.delete('/contactos/:id', (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM contactos WHERE (profesor_id = ? AND contacto_id = ?) OR (profesor_id = ? AND contacto_id = ?)')
    .run(req.profesorId, req.params.id, req.params.id, req.profesorId)
  res.json({ ok: true })
})

router.get('/mensajes/:contactoId', (req, res) => {
  const db = getDB()
  const mensajes = db.prepare(`
    SELECT m.*, p.nombre as de_nombre FROM mensajes m
    JOIN profesores p ON p.id = m.de_id
    WHERE (m.de_id = ? AND m.para_id = ?) OR (m.de_id = ? AND m.para_id = ?)
    ORDER BY m.created_at ASC
  `).all(req.profesorId, req.params.contactoId, req.params.contactoId, req.profesorId)
  res.json(mensajes)
})

router.post('/mensajes', (req, res) => {
  const { para_id, texto } = req.body
  if (!para_id || !texto?.trim()) return res.status(400).json({ error: 'para_id y texto son obligatorios' })

  const db     = getDB()
  const result = db.prepare('INSERT INTO mensajes (de_id, para_id, texto) VALUES (?, ?, ?)').run(req.profesorId, para_id, texto.trim())
  const msg    = db.prepare('SELECT * FROM mensajes WHERE id = ?').get(result.lastInsertRowid)

  const remitente = db.prepare('SELECT nombre, apellidos FROM profesores WHERE id = ?').get(req.profesorId)
  if (remitente) {
    db.prepare('INSERT INTO notificaciones (centro_id, profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)')
      .run(req.centroId, para_id, 'mensaje',
        `Mensaje de ${remitente.nombre} ${remitente.apellidos}`,
        texto.trim().length > 60 ? texto.trim().slice(0, 60) + '...' : texto.trim()
      )
  }
  res.status(201).json(msg)
})

module.exports = router