const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken } = require('../middleware/auth')

const router = express.Router()
router.use(verificarToken)

// ── GET /api/franjas ──────────────────────────────────────
// Lee las franjas del centro del usuario logado
router.get('/', (req, res) => {
  if (!req.centroId) return res.status(400).json({ error: 'No perteneces a ningún centro' })
  const db = getDB()
  const franjas = db.prepare(`
    SELECT id, orden, label, hora_inicio, hora_fin, reservable
    FROM franjas_centro
    WHERE centro_id = ?
    ORDER BY orden ASC
  `).all(req.centroId)
  res.json(franjas)
})

module.exports = router