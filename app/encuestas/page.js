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
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data, error } = await supabase
        .from('encuestas_catalogo')
        .select('codigo,nombre,tipo,activa')
        .eq('activa', true)
        .order('id');
      if (error) setError('No fue posible cargar las encuestas.');
      else setItems(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth: '760px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1>Encuestas disponibles</h1>
        <p>Instrumentos oficiales cargados en el sistema.</p>
        {loading && <p>Cargando…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && items.map((item) => (
          <div key={item.codigo} style={{border:'1px solid #dce6e2',borderRadius:'12px',padding:'16px',margin:'14px 0'}}>
            <strong>{item.nombre}</strong>
            <p style={{margin:'6px 0 0'}}>Tipo: {item.tipo}</p>
          </div>
        ))}
        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
