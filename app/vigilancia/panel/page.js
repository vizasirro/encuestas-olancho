'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '../../../utils/supabase/client';

export default function VigilanciaPanel(){
 const router=useRouter();const[perfil,setPerfil]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;(async()=>{const s=createClient();const {data:{session}}=await s.auth.getSession();if(!session){router.replace('/vigilancia/login');return}const res=await fetch('/api/vigilancia/perfil',{headers:{Authorization:`Bearer ${session.access_token}`}});const data=await res.json();if(!active)return;if(!res.ok)setError(data.error||'Acceso no autorizado.');else if(data.perfil?.debe_cambiar_password){router.replace('/vigilancia/cambiar-contrasena');return}else setPerfil(data.perfil);setLoading(false)})();return()=>{active=false}},[router]);
 async function salir(){const s=createClient();await s.auth.signOut();router.replace('/vigilancia/login')}
 if(loading)return <main className="vig-shell"><div className="vig-wrap"><section className="vig-card">Verificando acceso…</section></div></main>;
 const gestor=['ADMIN_GENERAL','GESTOR_USUARIOS'].includes(perfil?.rol);const seguimiento=['ADMIN_GENERAL','VIGILANCIA_REGIONAL','REGIONAL','ECOR','MUNICIPAL','AUDITOR'].includes(perfil?.rol);
 return <main className="vig-shell"><div className="vig-wrap"><header className="vig-header"><div className="vig-brand"><Image src="/viza-logo.svg" alt="Región Olancho" width={72} height={72}/><div><span className="vig-badge">VIGILANCIA OLANCHO</span><h1>Panel</h1><p>{perfil?.nombre} · {perfil?.rol}</p></div></div><button className="vig-button light" onClick={salir}>Cerrar sesión</button></header>
 {error?<section className="vig-card"><p className="vig-error">{error}</p></section>:<><section className="vig-grid">
   {gestor&&<a className="vig-card" href="/vigilancia/clinicas" style={{textDecoration:'none',color:'inherit'}}><h2>Clínicas y accesos</h2><p>Reuniones, registro, QR, códigos y responsables.</p></a>}
   {gestor&&<a className="vig-card" href="/vigilancia/usuarios" style={{textDecoration:'none',color:'inherit'}}><h2>Gestor de usuarios</h2><p>Crear, activar y suspender perfiles.</p></a>}
   {perfil?.rol==='RESPONSABLE_CLINICA'&&<a className="vig-card" href="/vigilancia/mi-clinica" style={{textDecoration:'none',color:'inherit'}}><h2>Mi clínica</h2><p>Cambiar el código de cuatro dígitos y recibirlo por correo.</p></a>}
   {seguimiento&&<a className="vig-card" href="/vigilancia/seguimiento" style={{textDecoration:'none',color:'inherit'}}><h2>Seguimiento semanal</h2><p>Notificaron, pendientes, fichas y listas nominales.</p></a>}
   {seguimiento&&<a className="vig-card" href="/vigilancia/reportes" style={{textDecoration:'none',color:'inherit'}}><h2>Boletines y búsqueda</h2><p>Consulta por enfermedad, semana e ID de paciente.</p></a>}
  </section><section className="vig-card"><h2>Regla de continuidad</h2><p>Las actividades rutinarias se resuelven por el responsable y su suplente. Solo se escalan incidentes críticos, incumplimientos persistentes o decisiones que requieren autoridad regional.</p></section></>}
 </div></main>;
}
