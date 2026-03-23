# 🏫 EduRooms

**Plataforma de gestión interna para centros educativos**  

---

## ¿Qué es EduRooms?

EduRooms es una aplicación web diseñada para facilitar la gestión diaria del profesorado en un instituto. Permite reservar aulas especiales por franjas horarias, controlar las salidas al baño del alumnado, gestionar listados de alumnos por curso y grupo, y comunicarse con otros profesores del centro.

El acceso está restringido al profesorado del centro. Cada cuenta nueva requiere aprobación del director antes de poder acceder.

---

## ✨ Funcionalidades

### 🏛️ Reserva de Aulas
- Visualización de todas las aulas especiales del centro (informática, laboratorios, talleres)
- Sistema de franjas horarias fijas adaptado al horario del IES Meléndez Valdés
- Vista de disponibilidad por día con navegación entre fechas
- Detección automática de conflictos de reserva
- Historial completo de reservas anteriores

**Franjas horarias:**
| Franja | Horario |
|--------|---------|
| 1ª hora | 08:15 – 09:10 |
| 2ª hora | 09:10 – 10:05 |
| 3ª hora | 10:05 – 11:00 |
| Recreo  | 11:00 – 11:30 |
| 4ª hora | 11:30 – 12:25 |
| 5ª hora | 12:25 – 13:20 |
| 6ª hora | 13:20 – 14:15 |

### 🚻 Control de Baños
- Registro de salidas al baño por alumno, curso y grupo
- Selector de alumno desde el listado del grupo (si está importado)
- Indicador de color según número de veces al baño en el día:
  - 🟢 Verde: 1-2 veces
  - 🟠 Naranja: 3-4 veces
  - 🔴 Rojo: 5 o más veces
- Edición de registros del día actual
- Historial completo de días anteriores

### 👥 Gestión de Alumnos
- Importación de listados desde Excel de Rayuela (Junta de Extremadura)
- Detección automática de cursos y grupos del archivo — sin configuración manual
- Organización por curso (1º ESO, 2º ESO, etc.) y grupo (A, B, C...)
- Visualización de la lista completa de cada grupo
- Compatible con cualquier número de grupos por curso

**Lectura de archivos Excel:**

La app lee directamente los archivos `.xls` exportados desde la plataforma **Rayuela** de la Junta de Extremadura usando la librería **[xlsx (SheetJS)](https://www.npmjs.com/package/xlsx)**.

El formato del archivo es el estándar de Rayuela:

| Alumnado | Grupo |
|----------|-------|
| Apellidos, Nombre | 1º ESO C |
| Apellidos, Nombre | 1º ESO A |

El parser lee cada fila, extrae apellidos y nombre (separados por coma) y detecta el grupo desde la letra final del campo Grupo (`1º ESO C` → grupo `C`). Funciona con cualquier número de grupos y cursos sin modificar el código.

### 💬 Social
- Lista de contactos entre profesores
- Chat privado entre compañeros
- Foto de perfil personalizada

### ⚙️ Panel de Administración (Director)
- Aprobación y rechazo de nuevas cuentas de profesores
- Gestión de cuentas activas (suspender, eliminar)
- Estadísticas de cuentas pendientes, aprobadas y rechazadas

---

## 🛠️ Stack tecnológico

### Backend
| Tecnología | Uso |
|------------|-----|
| Node.js | Entorno de ejecución |
| Express | API REST |
| better-sqlite3 | Base de datos local |
| bcryptjs | Cifrado de contraseñas |
| jsonwebtoken | Autenticación JWT |
| multer | Subida de fotos de perfil |
| cors | Comunicación frontend-backend |

### Frontend
| Tecnología | Uso |
|------------|-----|
| React 18 | Interfaz de usuario |
| xlsx (SheetJS) | Lectura de archivos Excel de Rayuela |
| React Router DOM | Navegación entre páginas |
| Vite | Bundler y servidor de desarrollo |
| CSS Variables | Sistema de diseño personalizado |

### Base de datos (SQLite)
```
profesores   → cuentas del profesorado
aulas        → salas especiales del centro
reservas     → reservas de aulas por franjas
contactos    → relaciones entre profesores
mensajes     → chat entre profesores
salidas_bano → registro de salidas al baño
alumnos      → listado de alumnos por curso y grupo
```

---

## 🚀 Instalación y puesta en marcha

### Requisitos
- [Node.js](https://nodejs.org) v18 o superior
- npm

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/edurooms.git
cd edurooms
```

### 2. Instalar dependencias

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Arrancar la aplicación

Abre dos terminales:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

La aplicación estará disponible en **http://localhost:5173**

---

## 🔑 Acceso de pruebas

Al arrancar el backend por primera vez se crea automáticamente la cuenta del director:

| Campo | Valor |
|-------|-------|
| Email | `director@edurooms.es` |
| Contraseña | `director1234` |

> ⚠️ Se recomienda cambiar la contraseña después del primer acceso.

El director debe aprobar cada nueva cuenta desde el **Panel de Administración** antes de que el profesor pueda acceder.

---

## 📁 Estructura del proyecto

```
edurooms/
├── backend/
│   └── src/
│       ├── index.js              # Servidor Express
│       ├── config/
│       │   └── database.js       # SQLite: tablas + seed inicial
│       ├── middleware/
│       │   └── auth.js           # Verificación JWT
│       └── routes/
│           ├── auth.js           # Registro y login
│           ├── aulas.js          # CRUD de aulas
│           ├── reservas.js       # Reservas por franja horaria
│           ├── social.js         # Contactos y mensajes
│           ├── perfil.js         # Foto de perfil
│           ├── bano.js           # Control de baños
│           ├── alumnos.js        # Listado de alumnos
│           └── admin.js          # Panel del director
└── frontend/
    └── src/
        ├── api/
        │   └── client.js         # Llamadas a la API
        ├── components/
        │   ├── shared/           # Layout, Modal, Toast
        │   └── Aulas/            # AulaDetalle, BanoPanel, HistorialReservas
        ├── config/
        │   └── franjas.js        # Franjas horarias del centro
        ├── hooks/
        │   ├── useAuth.jsx       # Contexto de sesión
        │   └── useToast.js       # Notificaciones
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Aulas.jsx
        │   ├── Alumnos.jsx
        │   ├── Social.jsx
        │   ├── Perfil.jsx
        │   └── Admin.jsx
        └── styles/
            └── global.css        # Variables CSS y estilos globales
```

---

## 🎨 Paleta de colores

| Variable | Color | Uso |
|----------|-------|-----|
| `--primary` | `#059669` | Verde esmeralda — color principal |
| `--black` | `#0a0a0a` | Negro — navbar y botones |
| `--white` | `#ffffff` | Blanco — fondos y tarjetas |
| `--accent` | `#34d399` | Verde claro — detalles |

---

## 📄 Licencia
 
Proyecto de uso interno para centros educativos.
Desarrollado con fines educativos y de gestión interna.