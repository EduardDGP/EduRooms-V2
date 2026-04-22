const { Resend } = require('resend')

const FROM     = 'ExRooms <noreply@exrooms.app>'
const BASE_URL = process.env.BASE_URL || 'https://exrooms.app'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

async function enviarEmailVerificacion({ email, nombre, centro_nombre, token }) {
  const url = `${BASE_URL}/verificar-centro?token=${token}`
  await getResend().emails.send({
    from: FROM, to: email,
    subject: 'Verifica tu centro en ExRooms',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <div style="margin-bottom:24px">
          <span style="background:#0a0a0a;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;font-size:18px;font-family:Georgia,serif">Ex<span style="color:#34d399">Rooms</span></span>
        </div>
        <h1 style="font-size:22px;color:#0a0a0a">Hola ${nombre},</h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Gracias por registrar <strong>${centro_nombre}</strong> en ExRooms. Verifica tu email haciendo click en el botón:
        </p>
        <div style="margin:32px 0;text-align:center">
          <a href="${url}" style="background:#0a0a0a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Verificar mi centro →</a>
        </div>
        <p style="color:#999;font-size:13px">Este enlace expirará en 24 horas.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:12px;text-align:center">ExRooms · Gestión interna para centros educativos</p>
      </div>`
  })
}

async function enviarEmailAprobacion({ email, nombre, centro_nombre, plan }) {
  const esPruebas = plan === 'pruebas'
  await getResend().emails.send({
    from: FROM, to: email,
    subject: '¡Tu centro ha sido aprobado en ExRooms!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <div style="margin-bottom:24px">
          <span style="background:#0a0a0a;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;font-size:18px;font-family:Georgia,serif">Ex<span style="color:#34d399">Rooms</span></span>
        </div>
        <h1 style="font-size:22px;color:#0a0a0a">¡Bienvenido a ExRooms, ${nombre}!</h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Tu centro <strong>${centro_nombre}</strong> ha sido aprobado${esPruebas ? ' como <strong>centro de pruebas (acceso gratuito)</strong>' : ''}.
          Ya puedes acceder con tu email y contraseña.
        </p>
        <div style="margin:32px 0;text-align:center">
          <a href="${BASE_URL}/login" style="background:#0a0a0a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Acceder a ExRooms →</a>
        </div>
        ${esPruebas ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:16px"><p style="color:#166534;font-size:13px;margin:0">🧪 Tienes acceso gratuito como centro de pruebas. Nos ayudarás con feedback para mejorar la plataforma.</p></div>` : ''}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:12px;text-align:center">ExRooms · Gestión interna para centros educativos</p>
      </div>`
  })
}

async function enviarEmailRechazo({ email, nombre, centro_nombre }) {
  await getResend().emails.send({
    from: FROM, to: email,
    subject: 'Actualización sobre tu solicitud en ExRooms',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <div style="margin-bottom:24px">
          <span style="background:#0a0a0a;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;font-size:18px;font-family:Georgia,serif">Ex<span style="color:#34d399">Rooms</span></span>
        </div>
        <h1 style="font-size:22px;color:#0a0a0a">Hola ${nombre},</h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Lamentamos informarte que la solicitud de <strong>${centro_nombre}</strong> no ha podido ser aprobada. Si crees que es un error, responde a este email.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:12px;text-align:center">ExRooms · Gestión interna para centros educativos</p>
      </div>`
  })
}

async function enviarEmailResetPassword({ email, nombre, token }) {
  const url = `${BASE_URL}/reset-password?token=${token}`
  await getResend().emails.send({
    from: FROM, to: email,
    subject: 'Restablecer contraseña — ExRooms',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <div style="margin-bottom:24px">
          <span style="background:#0a0a0a;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;font-size:18px;font-family:Georgia,serif">Ex<span style="color:#34d399">Rooms</span></span>
        </div>
        <h1 style="font-size:22px;color:#0a0a0a">Hola ${nombre},</h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz click en el botón para crear una nueva contraseña:
        </p>
        <div style="margin:32px 0;text-align:center">
          <a href="${url}" style="background:#0a0a0a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Restablecer contraseña →</a>
        </div>
        <p style="color:#999;font-size:13px">Este enlace expirará en 1 hora. Si no has solicitado este cambio, ignora este email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:12px;text-align:center">ExRooms · Gestión interna para centros educativos</p>
      </div>`
  })
}

async function enviarEmailEnlacePago({ email, nombre, centro_nombre, url }) {
  await getResend().emails.send({
    from: FROM, to: email,
    subject: 'Activa tu suscripción en ExRooms',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <div style="margin-bottom:24px">
          <span style="background:#0a0a0a;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;font-size:18px;font-family:Georgia,serif">Ex<span style="color:#34d399">Rooms</span></span>
        </div>
        <h1 style="font-size:22px;color:#0a0a0a">Hola ${nombre},</h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Tu centro <strong>${centro_nombre}</strong> está listo para activarse. Para completar el proceso, realiza el pago de la suscripción mensual de <strong>30€/mes</strong> haciendo click en el botón:
        </p>
        <div style="margin:32px 0;text-align:center">
          <a href="${url}" style="background:#0a0a0a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Activar suscripción — 30€/mes →</a>
        </div>
        <p style="color:#999;font-size:13px">Este enlace es personal y único para tu centro. Si tienes alguna duda, responde a este email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:12px;text-align:center">ExRooms · Gestión interna para centros educativos</p>
      </div>`
  })
}

// ─── NUEVO: Email de confirmación de abandono del centro ───
async function enviarEmailAbandonoCentro({ email, nombre, centro_nombre, token }) {
  const url = `${BASE_URL}/confirmar-abandono?token=${token}`
  await getResend().emails.send({
    from: FROM, to: email,
    subject: 'Confirma que abandonas tu centro en ExRooms',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <div style="margin-bottom:24px">
          <span style="background:#0a0a0a;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;font-size:18px;font-family:Georgia,serif">Ex<span style="color:#34d399">Rooms</span></span>
        </div>
        <h1 style="font-size:22px;color:#0a0a0a">Hola ${nombre},</h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          Has solicitado abandonar <strong>${centro_nombre}</strong>. Para confirmarlo, haz click en el botón:
        </p>
        <div style="margin:32px 0;text-align:center">
          <a href="${url}" style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Confirmar abandono del centro →</a>
        </div>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin:24px 0">
          <p style="color:#78350f;font-size:13px;margin:0;line-height:1.6">
            <strong>Importante:</strong> al confirmar perderás todas tus reservas futuras y guardias pendientes en este centro. Tu cuenta se mantendrá y podrás unirte a otro centro desde la pantalla de inicio de sesión con la opción <strong>"¿Has cambiado de centro?"</strong>.
          </p>
        </div>
        <p style="color:#999;font-size:13px">Si no has sido tú quien lo ha solicitado, ignora este email y tu cuenta seguirá igual.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:12px;text-align:center">ExRooms · Gestión interna para centros educativos</p>
      </div>`
  })
}

// ─── NUEVO: Aviso al director cuando un profe se une a su centro ───
async function enviarEmailNuevoProfesorEnCentro({ email, nombre_director, nombre_profesor, centro_nombre }) {
  await getResend().emails.send({
    from: FROM, to: email,
    subject: `Nuevo profesor solicita unirse a ${centro_nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <div style="margin-bottom:24px">
          <span style="background:#0a0a0a;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;font-size:18px;font-family:Georgia,serif">Ex<span style="color:#34d399">Rooms</span></span>
        </div>
        <h1 style="font-size:22px;color:#0a0a0a">Hola ${nombre_director},</h1>
        <p style="color:#555;font-size:15px;line-height:1.6">
          <strong>${nombre_profesor}</strong> ha solicitado unirse a <strong>${centro_nombre}</strong>. Entra en el panel de administración para aprobarlo o rechazarlo.
        </p>
        <div style="margin:32px 0;text-align:center">
          <a href="${BASE_URL}/admin" style="background:#0a0a0a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Ir al panel →</a>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#bbb;font-size:12px;text-align:center">ExRooms · Gestión interna para centros educativos</p>
      </div>`
  })
}

module.exports = {
  enviarEmailVerificacion,
  enviarEmailAprobacion,
  enviarEmailRechazo,
  enviarEmailResetPassword,
  enviarEmailEnlacePago,
  enviarEmailAbandonoCentro,
  enviarEmailNuevoProfesorEnCentro,
}