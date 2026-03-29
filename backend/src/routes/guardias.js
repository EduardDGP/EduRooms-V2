const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

router.get('/', (req, res) => {
  const db = getDB()
  const guardias = db.prepare(`
    SELECT g.*, p.nombre as prof_nombre, p.apellidos as prof_apellidos,
           c.nombre as cubierta_por_nombre, c.apellidos as cubierta_por_apellidos
    FROM guardias g
    JOIN profesores p ON p.id = g.profesor_id
    LEFT JOIN profesores c ON c.id = g.cubierta_por
    WHERE g.centro_id = ?
    ORDER BY g.fecha DESC, g.franja_orden
  `).all(req.centroId)
  res.json(guardias)
})

router.get('/hoy', (req, res) => {
  const db  = getDB()
  const hoy = new Date().toISOString().split('T')[0]
  const guardias = db.prepare(`
    SELECT g.*, p.nombre as prof_nombre, p.apellidos as prof_apellidos,
           c.nombre as cubierta_por_nombre, c.apellidos as cubierta_por_apellidos
    FROM guardias g
    JOIN profesores p ON p.id = g.profesor_id
    LEFT JOIN profesores c ON c.id = g.cubierta_por
    WHERE g.centro_id = ? AND g.fecha = ?
    ORDER BY g.franja_orden
  `).all(req.centroId, hoy)
  res.json(guardias)
})

router.post('/', (req, res) => {
  const { fecha, franja_id, franja_label, franja_orden, hora_inicio, hora_fin, curso, grupo, aula, instrucciones } = req.body
  if (!fecha || !franja_id || !curso || !grupo || !aula)
    return res.status(400).json({ error: 'Fecha, franja, curso, grupo y aula son obligatorios' })

  const hoy = new Date().toISOString().split('T')[0]
  if (fecha < hoy) return res.status(400).json({ error: 'No puedes registrar una guardia en fecha pasada' })

  const db     = getDB()
  const result = db.prepare(`
    INSERT INTO guardias (centro_id, profesor_id, fecha, franja_id, franja_label, franja_orden, hora_inicio, hora_fin, curso, grupo, aula, instrucciones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.centroId, req.profesorId, fecha, franja_id, franja_label, franja_orden || 0, hora_inicio || '', hora_fin || '', curso, grupo, aula, instrucciones?.trim() || '')

  const guardia = db.prepare(`
    SELECT g.*, p.nombre as prof_nombre, p.apellidos as prof_apellidos
    FROM guardias g JOIN profesores p ON p.id = g.profesor_id WHERE g.id = ?
  `).get(result.lastInsertRowid)

  const profesores = db.prepare("SELECT id FROM profesores WHERE aprobado = 1 AND id != ? AND centro_id = ?").all(req.profesorId, req.centroId)
  const ins = db.prepare('INSERT INTO notificaciones (centro_id, profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)')
  const tx  = db.transaction(profs => {
    for (const p of profs) {
      ins.run(req.centroId, p.id, 'guardia',
        `Guardia disponible — ${franja_label} (${fecha})`,
        `${guardia.prof_nombre} ${guardia.prof_apellidos} no puede acudir a ${curso} ${grupo} en ${aula}. ¿Puedes cubrir la guardia?`
      )
    }
  })
  tx(profesores)
  res.status(201).json(guardia)
})

router.post('/:id/cubrir', (req, res) => {
  const db      = getDB()
  const guardia = db.prepare('SELECT * FROM guardias WHERE id = ? AND centro_id = ?').get(req.params.id, req.centroId)
  if (!guardia) return res.status(404).json({ error: 'Guardia no encontrada' })
  if (guardia.profesor_id === req.profesorId) return res.status(400).json({ error: 'No puedes cubrir tu propia guardia' })
  if (guardia.cubierta_por) return res.status(409).json({ error: 'Esta guardia ya está cubierta' })

  db.prepare('UPDATE guardias SET cubierta_por = ? WHERE id = ?').run(req.profesorId, req.params.id)

  const cubridor = db.prepare('SELECT nombre, apellidos FROM profesores WHERE id = ?').get(req.profesorId)
  db.prepare('INSERT INTO notificaciones (centro_id, profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)')
    .run(req.centroId, guardia.profesor_id, 'guardia',
      '✅ Tu guardia ha sido cubierta',
      `${cubridor.nombre} ${cubridor.apellidos} cubrirá tu guardia del ${guardia.fecha} — ${guardia.franja_label}`
    )

  const actualizada = db.prepare(`
    SELECT g.*, p.nombre as prof_nombre, p.apellidos as prof_apellidos,
           c.nombre as cubierta_por_nombre, c.apellidos as cubierta_por_apellidos
    FROM guardias g JOIN profesores p ON p.id = g.profesor_id
    LEFT JOIN profesores c ON c.id = g.cubierta_por WHERE g.id = ?
  `).get(req.params.id)
  res.json(actualizada)
})

router.delete('/:id/cubrir', (req, res) => {
  const db      = getDB()
  const guardia = db.prepare('SELECT * FROM guardias WHERE id = ? AND centro_id = ?').get(req.params.id, req.centroId)
  if (!guardia) return res.status(404).json({ error: 'Guardia no encontrada' })
  if (guardia.cubierta_por !== req.profesorId) return res.status(403).json({ error: 'No eres quien cubre esta guardia' })
  db.prepare('UPDATE guardias SET cubierta_por = NULL WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  const db      = getDB()
  const guardia = db.prepare('SELECT * FROM guardias WHERE id = ? AND centro_id = ?').get(req.params.id, req.centroId)
  if (!guardia) return res.status(404).json({ error: 'Guardia no encontrada' })
  if (guardia.profesor_id !== req.profesorId) return res.status(403).json({ error: 'Solo puedes eliminar tus guardias' })
  db.prepare('DELETE FROM guardias WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router