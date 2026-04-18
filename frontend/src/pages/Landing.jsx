import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Shield, Users, Bell, MessageSquare, BookOpen, Clock, CheckCircle, ChevronDown, ArrowRight, Zap } from 'lucide-react'

function useVisible(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,.08)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 0', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
        <span style={{ fontSize:17, fontWeight:600, color:'#fff' }}>{q}</span>
        <ChevronDown size={20} color='rgba(255,255,255,.5)' style={{ flexShrink:0, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .3s' }} />
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow:'hidden', transition:'max-height .4s ease' }}>
        <p style={{ color:'rgba(255,255,255,.55)', fontSize:15, lineHeight:1.8, paddingBottom:22 }}>{a}</p>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc, delay = 0 }) {
  const [ref, visible] = useVisible()
  return (
    <div ref={ref} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:16, padding:'32px 28px', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transition: `opacity .6s ${delay}ms, transform .6s ${delay}ms` }}>
      <div style={{ width:48, height:48, borderRadius:12, background:'rgba(52,211,153,.12)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, color:'#34d399' }}>
        {icon}
      </div>
      <h3 style={{ fontSize:18, fontWeight:700, color:'#fff', marginBottom:10 }}>{title}</h3>
      <p style={{ color:'rgba(255,255,255,.5)', fontSize:14, lineHeight:1.7 }}>{desc}</p>
    </div>
  )
}

export default function Landing() {
  const [heroVisible, setHeroVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [savingsRef, savingsVisible] = useVisible()
  const [ctaRef, ctaVisible] = useVisible()

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 80)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div style={{ background:'#080808', minHeight:'100vh', fontFamily:"'Outfit', sans-serif", color:'#fff', overflowX:'hidden' }}>

      {/* Navbar */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'0 40px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', background: scrollY > 40 ? 'rgba(8,8,8,.92)' : 'transparent', backdropFilter: scrollY > 40 ? 'blur(20px)' : 'none', borderBottom: scrollY > 40 ? '1px solid rgba(255,255,255,.06)' : 'none', transition:'all .3s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:'#0a0a0a', border:'1.5px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:17, fontWeight:900, color:'#fff', fontFamily:'Georgia,serif' }}>E</span>
          </div>
          <span style={{ fontSize:18, fontWeight:800 }}>Ex<span style={{ color:'#34d399' }}>Rooms</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <a href="#funcionalidades" style={{ color:'rgba(255,255,255,.6)', textDecoration:'none', fontSize:14 }}>Funcionalidades</a>
          <a href="#precio" style={{ color:'rgba(255,255,255,.6)', textDecoration:'none', fontSize:14 }}>Precio</a>
          <a href="#faq" style={{ color:'rgba(255,255,255,.6)', textDecoration:'none', fontSize:14 }}>FAQ</a>
          <Link to="/login" style={{ color:'rgba(255,255,255,.6)', textDecoration:'none', fontSize:14 }}>Iniciar sesión</Link>
          <Link to="/registro" style={{ background:'#34d399', color:'#0a0a0a', textDecoration:'none', fontSize:14, fontWeight:700, padding:'9px 20px', borderRadius:8 }}>Registrar centro</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 40px 80px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(52,211,153,.1)', border:'1px solid rgba(52,211,153,.2)', borderRadius:100, padding:'6px 16px', fontSize:13, fontWeight:600, color:'#34d399', marginBottom:32, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(20px)', transition:'opacity .8s, transform .8s' }}>
          <Zap size={13} /> Gestión educativa moderna
        </div>
        <h1 style={{ fontSize:'clamp(42px, 7vw, 76px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', marginBottom:24, opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(30px)', transition:'opacity .8s 150ms, transform .8s 150ms' }}>
          Tu centro educativo,<br /><span style={{ color:'#34d399' }}>organizado al instante</span>
        </h1>
        <p style={{ fontSize:20, color:'rgba(255,255,255,.55)', lineHeight:1.7, maxWidth:580, margin:'0 auto 48px', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(30px)', transition:'opacity .8s 300ms, transform .8s 300ms' }}>
          ExRooms unifica la gestión de aulas, guardias, alumnos y comunicación interna en una sola plataforma. Sin papeles. Sin confusión.
        </p>
        <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(30px)', transition:'opacity .8s 450ms, transform .8s 450ms' }}>
          <Link to="/registro" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#34d399', color:'#0a0a0a', textDecoration:'none', fontSize:16, fontWeight:700, padding:'15px 32px', borderRadius:10 }}>
            Registrar mi centro <ArrowRight size={18} />
          </Link>
          <a href="#funcionalidades" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.8)', textDecoration:'none', fontSize:16, fontWeight:600, padding:'15px 32px', borderRadius:10, border:'1px solid rgba(255,255,255,.1)' }}>
            Ver funcionalidades
          </a>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" style={{ padding:'100px 40px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:64 }}>
          <p style={{ color:'#34d399', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', marginBottom:12 }}>Funcionalidades</p>
          <h2 style={{ fontSize:'clamp(32px, 5vw, 52px)', fontWeight:800, letterSpacing:'-1.5px' }}>Todo lo que necesita tu centro</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20 }}>
          <FeatureCard icon={<LayoutGrid size={24}/>}    title="Reserva de aulas"        desc="Reserva aulas por franjas horarias con detección automática de conflictos. Sin solapamientos, sin llamadas." />
          <FeatureCard icon={<Shield size={24}/>}        title="Gestión de guardias"     desc="Los profesores registran sus ausencias y los compañeros se apuntan para cubrirlas. Todo automatizado." />
          <FeatureCard icon={<Users size={24}/>}         title="Control de alumnos"      desc="Importa listas desde Excel Rayuela. Registro de salidas al baño con historial y frecuencias por alumno." />
          <FeatureCard icon={<Bell size={24}/>}          title="Notificaciones"          desc="Alertas automáticas de reservas, guardias y mensajes. Nunca te pierdas nada importante." />
          <FeatureCard icon={<MessageSquare size={24}/>} title="Chat entre profesores"   desc="Comunicación interna directa entre docentes. Sin WhatsApp, sin grupos externos." />
          <FeatureCard icon={<BookOpen size={24}/>}      title="Gestión de alumnos"      desc="Historial completo por alumno. Cursos, grupos y estadísticas accesibles en segundos." />
        </div>
      </section>

      {/* Ahorro de tiempo */}
      <section style={{ padding:'100px 40px', background:'rgba(255,255,255,.02)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <p style={{ color:'#34d399', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', marginBottom:12 }}>Ahorro de tiempo</p>
            <h2 style={{ fontSize:'clamp(32px, 5vw, 52px)', fontWeight:800, letterSpacing:'-1.5px' }}>Menos papeleo, más docencia</h2>
          </div>
          <div ref={savingsRef} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:20 }}>
            {[
              { icon:<Clock size={28}/>,         time:'45 min', label:'Gestión de guardias'   },
              { icon:<LayoutGrid size={28}/>,    time:'30 min', label:'Reserva de aulas'      },
              { icon:<Users size={28}/>,         time:'1 hora', label:'Control de alumnos'    },
              { icon:<MessageSquare size={28}/>, time:'20 min', label:'Comunicación interna'  },
            ].map((s, i) => (
              <div key={i} style={{ background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.15)', borderRadius:16, padding:'28px 24px', textAlign:'center', opacity: savingsVisible ? 1 : 0, transform: savingsVisible ? 'translateY(0)' : 'translateY(24px)', transition: `opacity .6s ${i*100}ms, transform .6s ${i*100}ms` }}>
                <div style={{ color:'#34d399', display:'flex', justifyContent:'center', marginBottom:16 }}>{s.icon}</div>
                <div style={{ fontSize:32, fontWeight:800, color:'#34d399', lineHeight:1 }}>{s.time}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#fff', marginTop:8 }}>{s.label}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:4 }}>por semana ahorrados</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign:'center', fontSize:18, color:'rgba(255,255,255,.6)', lineHeight:1.8, marginTop:40 }}>
            En total, <strong style={{ color:'#34d399' }}>más de 2 horas y media por semana</strong> que puedes dedicar a lo que importa: enseñar.
          </p>
        </div>
      </section>

      {/* Precio */}
      <section id="precio" style={{ padding:'100px 40px', maxWidth:800, margin:'0 auto', textAlign:'center' }}>
        <p style={{ color:'#34d399', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', marginBottom:12 }}>Precio</p>
        <h2 style={{ fontSize:'clamp(32px, 5vw, 52px)', fontWeight:800, letterSpacing:'-1.5px', marginBottom:16 }}>Simple y transparente</h2>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:16, marginBottom:56 }}>Sin sorpresas. Un precio para todo tu centro.</p>
        <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(52,211,153,.3)', borderRadius:24, padding:'48px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #34d399, transparent)' }} />
          <div style={{ fontSize:72, fontWeight:900, letterSpacing:'-3px', lineHeight:1 }}>30<span style={{ fontSize:32, color:'rgba(255,255,255,.4)', fontWeight:500 }}>€</span></div>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:16, marginBottom:40 }}>por centro / mes · IVA no incluido</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, textAlign:'left', marginBottom:40 }}>
            {['Profesores ilimitados','Todas las funcionalidades','Actualizaciones automáticas','Soporte por email','Sin permanencia','Cancela cuando quieras'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, color:'rgba(255,255,255,.7)' }}>
                <CheckCircle size={16} color='#34d399' style={{ flexShrink:0 }} /> {f}
              </div>
            ))}
          </div>
          <Link to="/registro" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#34d399', color:'#0a0a0a', textDecoration:'none', fontSize:16, fontWeight:700, padding:'15px 40px', borderRadius:10, width:'100%', justifyContent:'center' }}>
            Registrar mi centro ahora <ArrowRight size={18} />
          </Link>
          <p style={{ color:'rgba(255,255,255,.3)', fontSize:13, marginTop:16 }}>Centros de prueba: acceso gratuito durante el período piloto</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding:'80px 40px', maxWidth:700, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <p style={{ color:'#34d399', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'2px', marginBottom:12 }}>FAQ</p>
          <h2 style={{ fontSize:'clamp(28px, 4vw, 44px)', fontWeight:800, letterSpacing:'-1px' }}>Preguntas frecuentes</h2>
        </div>
        <FAQ q="¿Necesito instalar algún programa?" a="No. ExRooms funciona completamente en el navegador — Chrome, Safari, Firefox, Edge. También funciona en móvil." />
        <FAQ q="¿Cuántos profesores pueden usar la plataforma?" a="Todos los que necesites. El precio de 30€/mes es por centro, sin límite de usuarios." />
        <FAQ q="¿Cómo funciona el proceso de registro?" a="El director registra el centro, verifica su email y nosotros revisamos la solicitud. Una vez aprobado, puede invitar a todos los profesores." />
        <FAQ q="¿Puedo cancelar cuando quiera?" a="Sí. Sin permanencia ni penalizaciones. Tu centro permanece activo hasta el final del período pagado." />
        <FAQ q="¿Los datos de mi centro son seguros?" a="Sí. Cada centro tiene su propio espacio aislado. Los datos se almacenan en servidores europeos." />
        <FAQ q="¿Hay período de prueba gratuito?" a="Sí. Los primeros centros tendrán acceso gratuito durante el período piloto a cambio de feedback." />
      </section>

      {/* CTA Final */}
      <section style={{ padding:'100px 40px', textAlign:'center' }}>
        <div ref={ctaRef} style={{ opacity: ctaVisible ? 1 : 0, transform: ctaVisible ? 'translateY(0)' : 'translateY(40px)', transition:'opacity .8s, transform .8s' }}>
        <h2 style={{ fontSize:'clamp(36px, 6vw, 64px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.05, marginBottom:24 }}>
          Puedes registrarte<br /><span style={{ color:'#34d399' }}>ahora mismo</span>
        </h2>
        <p style={{ color:'rgba(255,255,255,.5)', fontSize:18, marginBottom:48, lineHeight:1.7 }}>
          El proceso de registro toma menos de 2 minutos.
        </p>
        <Link to="/registro" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'#34d399', color:'#0a0a0a', textDecoration:'none', fontSize:18, fontWeight:800, padding:'18px 48px', borderRadius:12 }}>
          Registrar mi centro <ArrowRight size={20} />
        </Link>
        <p style={{ color:'rgba(255,255,255,.25)', fontSize:13, marginTop:20 }}>Sin tarjeta de crédito · Configuración en 2 minutos</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'40px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <span style={{ fontSize:15, fontWeight:700 }}>Ex<span style={{ color:'#34d399' }}>Rooms</span></span>
        <p style={{ color:'rgba(255,255,255,.25)', fontSize:13 }}>© 2026 ExRooms · Gestión interna para centros educativos</p>
        <div style={{ display:'flex', gap:20 }}>
          <Link to="/login" style={{ color:'rgba(255,255,255,.35)', textDecoration:'none', fontSize:13 }}>Iniciar sesión</Link>
          <Link to="/registro" style={{ color:'rgba(255,255,255,.35)', textDecoration:'none', fontSize:13 }}>Registrar centro</Link>
        </div>
      </footer>
    </div>
  )
}