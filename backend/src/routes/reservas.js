const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

// ── Helper: validar franja contra franjas_centro ──────────
// Devuelve la franja si es válida y reservable. Lanza error si no.
function validarFranja({ db, centroId, hora_inicio, hora_fin, franja_label }) {
  const franja = db.prepare(`
    SELECT id, orden, label, hora_inicio, hora_fin, reservable
    FROM franjas_centro
    WHERE centro_id = ? AND hora_inicio = ? AND hora_fin = ?
  `).get(centroId, hora_inicio, hora_fin)

  if (!franja) {
    return { error: 'Esa franja horaria no existe en tu centro' }
  }
  if (!franja.reservable) {
    return { error: 'Esa franja no es reservable (recreo o similar)' }
  }
  // Verificar que el label coincide (sanity check)
  if (franja.label !== franja_label) {
    return { error: 'El nombre de la franja no coincide con el del centro' }
  }
  return { franja }
}

// ── GET /api/reservas ─────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDB()
  const reservas = db.prepare(`
    SELECT r.*, a.nombre as aula_nombre, a.tipo as aula_tipo
    FROM reservas r JOIN aulas a ON a.id = r.aula_id
    WHERE r.profesor_id = ? AND r.centro_id = ?
    ORDER BY r.fecha DESC, r.franja_orden
  `).all(req.profesorId, req.centroId)
  res.json(reservas)
})

// ── GET /api/reservas/aula/:aulaId ────────────────────────
router.get('/aula/:aulaId', (req, res) => {
  const db = getDB()
  const { fecha } = req.query
  let query = `
    SELECT r.*, p.nombre, p.apellidos, p.asignatura as prof_asignatura
    FROM reservas r JOIN profesores p ON p.id = r.profesor_id
    WHERE r.aula_id = ? AND r.centro_id = ?
  `
  const params = [req.params.aulaId, req.centroId]
  if (fecha) { query += ' AND r.fecha = ?'; params.push(fecha) }
  query += ' ORDER BY r.fecha DESC, r.franja_orden'
  res.json(db.prepare(query).all(...params))
})

// ── GET /api/reservas/historial ───────────────────────────
router.get('/historial', (req, res) => {
  const db = getDB()
  const reservas = db.prepare(`
    SELECT r.*, a.nombre as aula_nombre, a.tipo as aula_tipo,
           p.nombre as prof_nombre, p.apellidos as prof_apellidos
    FROM reservas r
    JOIN aulas a ON a.id = r.aula_id
    JOIN profesores p ON p.id = r.profesor_id
    WHERE r.centro_id = ?
    ORDER BY r.fecha DESC, r.franja_orden
    LIMIT 300
  `).all(req.centroId)
  res.json(reservas)
})

// ── POST /api/reservas ────────────────────────────────────
router.post('/', (req, res) => {
  const { aula_id, asignatura, fecha, franja_id, franja_label, franja_orden, hora_inicio, hora_fin } = req.body

  // Validación 1: campos obligatorios
  if (!aula_id || !asignatura || !fecha || !franja_id || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  // Validación 2: formato hora
  if (!/^\d{2}:\d{2}$/.test(hora_inicio) || !/^\d{2}:\d{2}$/.test(hora_fin)) {
    return res.status(400).json({ error: 'Formato de hora inválido' })
  }

  // Validación 3: fecha no pasada
  const hoy = new Date().toISOString().split('T')[0]
  if (fecha < hoy) return res.status(400).json({ error: 'No puedes reservar en una fecha pasada' })

  const db = getDB()

  // Validación 4: el aula pertenece al centro del profe
  const aula = db.prepare('SELECT id FROM aulas WHERE id = ? AND centro_id = ?').get(aula_id, req.centroId)
  if (!aula) return res.status(404).json({ error: 'El aula no existe en tu centro' })

  // Validación 5: la franja existe en franjas_centro y es reservable
  const v = validarFranja({ db, centroId: req.centroId, hora_inicio, hora_fin, franja_label })
  if (v.error) return res.status(400).json({ error: v.error })

  // Validación 6: no hay conflicto (misma franja ya reservada)
  const conflicto = db.prepare(
    'SELECT id FROM reservas WHERE aula_id = ? AND fecha = ? AND franja_id = ? AND centro_id = ?'
  ).get(aula_id, fecha, franja_id, req.centroId)
  if (conflicto) return res.status(409).json({ error: 'Esta franja ya está reservada en esa fecha' })

  // Crear reserva (usando los datos validados de la franja, no los del cliente)
  const result = db.prepare(`
    INSERT INTO reservas (centro_id, aula_id, profesor_id, asignatura, fecha, franja_id, franja_label, franja_orden, hora_inicio, hora_fin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.centroId,
    aula_id,
    req.profesorId,
    String(asignatura).trim().slice(0, 200),
    fecha,
    franja_id,
    v.franja.label,
    v.franja.orden,
    v.franja.hora_inicio,
    v.franja.hora_fin
  )

  const reserva = db.prepare(`
    SELECT r.*, a.nombre as aula_nombre, p.nombre as prof_nombre, p.apellidos as prof_apellidos
    FROM reservas r JOIN aulas a ON a.id = r.aula_id JOIN profesores p ON p.id = r.profesor_id
    WHERE r.id = ?
  `).get(result.lastInsertRowid)

  // Notificaciones a compañeros
  const fechaLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
  const profesores = db.prepare("SELECT id FROM profesores WHERE aprobado = 1 AND id != ? AND centro_id = ?").all(req.profesorId, req.centroId)
  const ins = db.prepare('INSERT INTO notificaciones (centro_id, profesor_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)')
  const tx  = db.transaction(profs => {
    for (const p of profs) {
      ins.run(req.centroId, p.id, 'reserva',
        `Nueva reserva — ${reserva.aula_nombre}`,
        `${reserva.prof_nombre} ${reserva.prof_apellidos} ha reservado ${reserva.aula_nombre} el ${fechaLabel} (${v.franja.label})`
      )
    }
  })
  tx(profesores)

  res.status(201).json(reserva)
})

// ── DELETE /api/reservas/:id ──────────────────────────────
router.delete('/:id', (req, res) => {
  const db      = getDB()
  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ? AND centro_id = ?').get(req.params.id, req.centroId)
  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' })
  if (reserva.profesor_id !== req.profesorId) return res.status(403).json({ error: 'No puedes cancelar esta reserva' })
  db.prepare('DELETE FROM reservas WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router