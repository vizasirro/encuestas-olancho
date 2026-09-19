'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

async function token() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

export default function BoletinDetalle() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [counts, setCounts] = useState({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function call(options = {}) {
    const accessToken = await token();
    const suffix = options.method ? '' : `?id=${id}`;
    const response = await fetch(`/api/vigilancia/boletines${suffix}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }

  async function load() {
    try {
      const result = await call();
      setData(result);
      setCounts(Object.fromEntries(result.enfermedades.map(disease => [
        disease.codigo,
        result.conteos.find(count => count.enfermedad_codigo === disease.codigo)?.cantidad || 0
      ])));
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function save() {
    setError(''); setOk('');
    try {
      await call({ method: 'PATCH', body: JSON.stringify({ id, motivo: reason, conteos: counts }) });
      setOk('Corrección guardada con auditoría de antes y después.');
      await load();
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  if (!data) return <main className="vig-shell"><div className="vig-wrap"><section className="vig-card">{error || 'Cargando…'}</section></div></main>;
  return <main className="vig-shell"><div className="vig-wrap">
    <div className="vig-header"><div><span className="vig-badge">BOLETÍN {data.boletin.estado}</span><h1>{data.boletin.vigilancia_clinicas?.nombre}</h1><p>SE {data.boletin.semana_epidemiologica} · {data.boletin.anio}</p></div><a className="vig-button light" href="/vigilancia/reportes">Volver</a></div>
    <section className="vig-card"><div className="vig-disease-grid">{data.enfermedades.map(disease => {
      const immediate = data.conteos.find(count => count.enfermedad_codigo === disease.codigo)?.casos_inmediatos || 0;
      return <div className="vig-disease" key={disease.codigo}><label><span>{disease.nombre}</span><input type="number" min={immediate} value={counts[disease.codigo]} disabled={!data.puede_modificar} onChange={event => setCounts(current => ({ ...current, [disease.codigo]: Number(event.target.value) }))}/></label></div>;
    })}</div>
    {data.puede_modificar && <><label className="vig-field" style={{marginTop:'18px'}}>Motivo obligatorio de la corrección<textarea value={reason} onChange={event => setReason(event.target.value)} required/></label><button className="vig-button" onClick={save}>GUARDAR CORRECCIÓN AUDITADA</button></>}
    {error && <p className="vig-error">{error}</p>}{ok && <p className="vig-ok">{ok}</p>}</section>
  </div></main>;
}
