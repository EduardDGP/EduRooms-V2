const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

router.get('/', (req, res) => {
  const db    = getDB()
  const desde = new Date()
  desde.setDate(desde.getDate() - 7)
  const desdeStr = desde.toISOString().split('T')[0]
  const notifs = db.prepare(`
    SELECT * FROM notificaciones
    WHERE profesor_id = ? AND DATE(created_at) >= ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.profesorId, desdeStr)
  res.json(notifs)
})

router.get('/no-leidas', (req, res) => {
  const db = getDB()
  const n  = db.prepare('SELECT COUNT(*) as total FROM notificaciones WHERE profesor_id = ? AND leida = 0').get(req.profesorId)
  res.json({ total: n.total })
})

router.put('/leer-todas', (req, res) => {
  const db = getDB()
  db.prepare('UPDATE notificaciones SET leida = 1 WHERE profesor_id = ?').run(req.profesorId)
  res.json({ ok: true })
})

module.exports = router