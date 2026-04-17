const express = require('express')
const { getDB } = require('../config/database')
const { verificarToken, soloSuperadmin } = require('../middleware/auth')

const router = express.Router()

function getStripe() {
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

// ── POST /api/stripe/crear-sesion ─────────────────────────
// El superadmin genera un enlace de pago para un centro
router.post('/crear-sesion', verificarToken, soloSuperadmin, async (req, res) => {
  const { centro_id } = req.body
  if (!centro_id) return res.status(400).json({ error: 'centro_id requerido' })

  const db     = getDB()
  const centro = db.prepare(`
    SELECT c.*, p.email, p.nombre, p.apellidos
    FROM centros c
    JOIN profesores p ON p.centro_id = c.id AND p.rol = 'director'
    WHERE c.id = ?
  `).get(centro_id)

  if (!centro) return res.status(404).json({ error: 'Centro no encontrado' })

  try {
    const stripe = getStripe()

    // Crear o recuperar cliente de Stripe
    let customerId = centro.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: centro.email,
        name:  `${centro.nombre} — ${centro.nombre_dir || ''} ${centro.apellidos || ''}`.trim(),
        metadata: { centro_id: String(centro_id), centro_nombre: centro.nombre }
      })
      customerId = customer.id
      db.prepare('UPDATE centros SET stripe_customer_id = ? WHERE id = ?').run(customerId, centro_id)
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.BASE_URL}/login?pago=ok`,
      cancel_url:  `${process.env.BASE_URL}/login?pago=cancelado`,
      metadata: { centro_id: String(centro_id) },
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Error Stripe:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/stripe/webhook ──────────────────────────────
// Stripe notifica cuando un pago se completa
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig    = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(req.body, sig, secret)
  } catch (err) {
    console.error('Webhook error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const db = getDB()

  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object
    const centro_id = session.metadata?.centro_id
    if (centro_id) {
      db.prepare('UPDATE centros SET aprobado = 1, plan = ? WHERE id = ?').run('activo', centro_id)
      console.log(`✅ Centro ${centro_id} activado por pago`)
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    const obj       = event.data.object
    const customerId = obj.customer
    const centro    = db.prepare('SELECT id FROM centros WHERE stripe_customer_id = ?').get(customerId)
    if (centro) {
      db.prepare('UPDATE centros SET plan = ? WHERE id = ?').run('bloqueado', centro.id)
      console.log(`🔒 Centro ${centro.id} bloqueado por falta de pago`)
    }
  }

  res.json({ received: true })
})

// ── GET /api/stripe/portal/:centro_id ────────────────────
// El director accede al portal de facturación de Stripe
router.get('/portal/:centro_id', verificarToken, async (req, res) => {
  const db     = getDB()
  const centro = db.prepare('SELECT stripe_customer_id FROM centros WHERE id = ?').get(req.params.centro_id)

  if (!centro?.stripe_customer_id)
    return res.status(404).json({ error: 'No hay suscripción activa para este centro' })

  try {
    const stripe  = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer:   centro.stripe_customer_id,
      return_url: `${process.env.BASE_URL}/admin`,
    })
    res.json({ url: session.url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router