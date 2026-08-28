'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const ROLES = [
  ['ADMIN_GENERAL','Administrador General','Autoridad máxima del sistema. Gestiona todos los perfiles, parámetros y alcance departamental.'],
  ['ADMIN_ENCUESTAS','Administrador de Encuestas','Administra únicamente encuestadores dentro del alcance autorizado.'],
  ['JEFE_ENCUESTADORES','Jefe de Encuestadores','Planifica, supervisa, asigna establecimiento/tipo de encuesta y también puede aplicar encuestas.'],
  ['ENCUESTADOR','Encuestador','Aplica encuestas. Debe ser externo a SESAL y trabajar solo en su asignación vigente.'],
  ['CONSULTA_ECOR','Consulta ECOR','Solo lectura para el ECOR asignado.'],
  ['CONSULTA_MUNICIPAL','Consulta Municipal','Solo lectura para el municipio y sus establecimientos autorizados.'],
  ['CONSULTA_ESTABLECIMIENTO','Consulta Establecimiento','Solo lectura para el establecimiento asignado.'],
  ['DIRECTOR_HOSPITALARIO','Director Hospitalario','Solo lectura para su hospital y sus servicios.']
];

export default function RolesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');
      const { data } = await supabase.rpc('obtener_mi_perfil');
      const perfil = Array.isArray(data) ? data[0] : null;
      if (!perfil || perfil.rol !== 'ADMIN_GENERAL') return router.replace('/panel');
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  if (loading) return <main className="shell"><section className="loginCard"><p>Cargando perfiles…</p></section></main>;

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth:'920px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1 style={{fontSize:'34px'}}>Tipos de usuario</h1>
        <p>Perfiles oficiales habilitados en Encuestas.</p>
        {ROLES.map(([codigo,nombre,descripcion]) => (
          <div key={codigo} style={{border:'1px solid #dce6e2',borderRadius:'12px',padding:'15px',margin:'12px 0'}}>
            <strong>{nombre}</strong>
            <p style={{margin:'5px 0',color:'#647a74'}}>{codigo}</p>
            <p style={{marginBottom:0}}>{descripcion}</p>
          </div>
        ))}
        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
