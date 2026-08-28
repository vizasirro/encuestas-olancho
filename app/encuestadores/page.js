'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function EncuestadoresPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rol, setRol] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: perfilData } = await supabase.rpc('obtener_mi_perfil');
      const perfil = Array.isArray(perfilData) ? perfilData[0] : null;
      if (!perfil || !['ADMIN_GENERAL','ADMIN_ENCUESTAS','JEFE_ENCUESTADORES'].includes(perfil.rol) || !perfil.activo) {
        router.replace('/panel');
        return;
      }
      setRol(perfil.rol);

      const { data, error: rpcError } = await supabase.rpc('listar_encuestadores_admin');
      if (!active) return;

      if (rpcError) setError('No fue posible cargar los encuestadores.');
      else setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [router]);

  const soloConsulta = rol === 'JEFE_ENCUESTADORES';

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth:'900px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1 style={{fontSize:'34px'}}>{soloConsulta ? 'Encuestadores asignados' : 'Gestionar encuestadores'}</h1>
        <p>{soloConsulta ? 'Consulta operativa para supervisión y asignación del tipo de encuesta.' : rol === 'ADMIN_ENCUESTAS' ? 'Administración de encuestadores dentro del alcance autorizado.' : 'Administración general de asignaciones de encuestadores.'}</p>

        <div style={{background:'#f7faf9',border:'1px solid #dce6e2',borderRadius:'12px',padding:'14px',margin:'18px 0'}}>
          <strong>Reglas vigentes</strong>
          <p style={{margin:'8px 0 0'}}>Cada encuestador debe ser externo a SESAL, conservar un ID único permanente y tener establecimiento u hospital asignado. El Jefe define previamente el tipo de encuesta; el encuestador no lo elige.</p>
        </div>

        {loading && <p>Cargando…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <div style={{border:'1px dashed #bdcbc6',borderRadius:'12px',padding:'18px',margin:'18px 0'}}>
            <strong>Aún no hay encuestadores asignados.</strong>
            <p style={{marginBottom:0}}>Cuando existan asignaciones, aparecerán aquí con ID, establecimiento, tipo de encuesta y estado.</p>
          </div>
        )}

        {!loading && !error && items.map((item) => (
          <div key={`${item.usuario_id}-${item.encuestador_id}-${item.fecha_asignacion}`} style={{border:'1px solid #dce6e2',borderRadius:'12px',padding:'16px',margin:'14px 0'}}>
            <p style={{margin:'0 0 6px'}}><strong>{item.nombre || 'Encuestador'}</strong> · {item.encuestador_id}</p>
            <p style={{margin:'6px 0'}}><strong>Asignación:</strong> {item.establecimiento_nombre} {item.hospital ? '(Hospital)' : ''}</p>
            <p style={{margin:'6px 0'}}><strong>Tipo:</strong> {item.tipo_encuesta === 'AMBULATORIA' ? 'Atención Ambulatoria' : 'Hospitalización / Internamiento'}</p>
            <p style={{margin:'6px 0'}}><strong>Externo a SESAL:</strong> {item.es_externo_sesal ? 'Sí' : 'No'}</p>
            <p style={{margin:'6px 0'}}><strong>Estado:</strong> {item.activo ? 'Activo' : 'Inactivo'}</p>
          </div>
        ))}

        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
