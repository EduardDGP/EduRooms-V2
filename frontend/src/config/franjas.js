// Franjas horarias del centro educativo
export const FRANJAS = [
  { id: 'h1', label: '1ª hora',  orden: 1, inicio: '08:15', fin: '09:10' },
  { id: 'h2', label: '2ª hora',  orden: 2, inicio: '09:10', fin: '10:05' },
  { id: 'h3', label: '3ª hora',  orden: 3, inicio: '10:05', fin: '11:00' },
  { id: 'rc', label: 'Recreo',   orden: 4, inicio: '11:00', fin: '11:30', recreo: true },
  { id: 'h4', label: '4ª hora',  orden: 5, inicio: '11:30', fin: '12:25' },
  { id: 'h5', label: '5ª hora',  orden: 6, inicio: '12:25', fin: '13:20' },
  { id: 'h6', label: '6ª hora',  orden: 7, inicio: '13:20', fin: '14:15' },
]

// Franjas reservables (sin recreo)
export const FRANJAS_RESERVABLES = FRANJAS.filter(f => !f.recreo)