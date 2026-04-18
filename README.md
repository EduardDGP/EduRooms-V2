# ExRooms

Plataforma de gestión interna para centros educativos. Permite a profesores y directores gestionar reservas de aulas, control de baños, guardias, comunicación interna y más.


---

## Stack tecnológico

**Backend:** Node.js + Express + SQLite (better-sqlite3) + PM2  
**Frontend:** React 18 + Vite + React Router  
**Servidor:** Hetzner CX23 (Ubuntu 24.04) + Nginx + Let's Encrypt  
**Emails:** Resend  
**Pagos:** Stripe  

---

## Funcionalidades

- **Aulas** — reserva de aulas por franjas horarias con detección de conflictos
- **Baños** — control de salidas de alumnos con historial y colores por frecuencia
- **Guardias** — registro de ausencias con instrucciones, los profesores pueden apuntarse a cubrir
- **Alumnos** — importación desde Excel Rayuela
- **Social** — contactos y chat entre profesores
- **Notificaciones** — alertas de reservas, mensajes y guardias
- **Perfil** — foto, datos personales y cambio de contraseña por email

## Roles

| Rol | Descripción |
|-----|-------------|
| `superadmin` | Gestión global de centros, aprobaciones y pagos |
| `director` | Gestiona su centro, aprueba cuentas, añade jefes de estudios |
| `jefe_estudios` | Puede aprobar cuentas de profesores |
| `profesor` | Uso normal de la app |

---

## Estructura del proyecto

```
edurooms/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       ← Inicialización SQLite
│   │   ├── middleware/
│   │   │   └── auth.js           ← JWT y roles
│   │   ├── routes/
│   │   │   ├── auth.js           ← Login, registro, verificación
│   │   │   ├── aulas.js
│   │   │   ├── reservas.js
│   │   │   ├── social.js
│   │   │   ├── perfil.js
│   │   │   ├── bano.js
│   │   │   ├── admin.js
│   │   │   ├── alumnos.js
│   │   │   ├── notificaciones.js
│   │   │   ├── guardias.js
│   │   │   ├── superadmin.js
│   │   │   └── stripe.js
│   │   ├── utils/
│   │   │   └── email.js          ← Emails con Resend
│   │   └── index.js
│   ├── ecosystem.config.js       ← Configuración PM2
│   └── .env                      ← Variables de entorno (no en git)
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js         ← Llamadas al backend
    │   ├── components/
    │   │   ├── Aulas/
    │   │   └── shared/
    │   ├── config/
    │   │   └── franjas.js        ← Franjas horarias
    │   ├── hooks/
    │   ├── pages/
    │   └── styles/
    └── index.html
```

---

### Requisitos
- Node.js 18+
- npm

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Estructura en el servidor

```
/var/www/edurooms/
├── backend/
│   ├── src/
│   ├── uploads/          ← Fotos y logos subidos
│   ├── ecosystem.config.js
│   └── .env
└── frontend/
    └── dist/             ← Build servido por Nginx
```

---

## Panel Superadmin

- Ver y gestionar todos los centros
- Aprobar centros como **pruebas** (gratis) o enviar enlace de pago (30€/mes)
- Ver actividad global: reservas, guardias, mensajes
- Estadísticas por centro

---

## Modelo de negocio

- **Centros de pruebas:** gratuitos, dan feedback
- **Centros de pago:** 30€/mes via Stripe
- El pago activa el centro automáticamente via webhook
- Si deja de pagar, el centro se bloquea automáticamente

---

## Repositorios

- **V1:** github.com/EduardDGP/edurooms
- **V2 (actual):** github.com/EduardDGP/EduRooms-V2