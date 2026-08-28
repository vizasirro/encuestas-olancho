'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function EncuestasPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/login');
        return;
      }

      const { data, error: catalogError } = await supabase.rpc('listar_encuestas_disponibles');
      if (!active) return;

      if (catalogError) {
        console.error('Error al cargar encuestas:', catalogError);
        setError('No fue posible cargar las encuestas.');
      } else {
        setItems(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [router]);

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth: '760px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1>Encuestas disponibles</h1>
        <p>Instrumentos oficiales cargados en el sistema.</p>
        {loading && <p>Cargando…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && items.length === 0 && <p>No hay encuestas activas.</p>}
        {!loading && !error && items.map((item) => (
          <div key={item.codigo} style={{border:'1px solid #dce6e2',borderRadius:'12px',padding:'16px',margin:'14px 0'}}>
            <strong>{item.nombre}</strong>
            <p style={{margin:'6px 0 0'}}>Tipo: {item.tipo}</p>
            <p style={{margin:'6px 0 0'}}>Preguntas: {item.preguntas}</p>
            <a className="button" href={`/encuestas/${item.codigo}`} style={{marginTop:'12px'}}>ABRIR INSTRUMENTO</a>
          </div>
        ))}
        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
