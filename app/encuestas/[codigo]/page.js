'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function InstrumentoPage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params?.codigo;
  const [preguntas, setPreguntas] = useState([]);
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState({});
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

      const { data, error: rpcError } = await supabase.rpc('obtener_preguntas_encuesta', { p_codigo: codigo });
      if (!active) return;

      if (rpcError) {
        console.error(rpcError);
        setError('No fue posible cargar las preguntas de esta encuesta.');
      } else {
        setPreguntas(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    }

    if (codigo) load();
    return () => { active = false; };
  }, [codigo, router]);

  const pregunta = preguntas[indice];
  const titulo = preguntas[0]?.nombre || 'Encuesta';
  const progreso = preguntas.length ? Math.round(((indice + 1) / preguntas.length) * 100) : 0;
  const opciones = useMemo(() => {
    const raw = pregunta?.opciones;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
  }, [pregunta]);

  function responder(valor) {
    setRespuestas((prev) => ({ ...prev, [pregunta.orden]: valor }));
  }

  function siguiente() {
    if (indice < preguntas.length - 1) setIndice((i) => i + 1);
  }

  function anterior() {
    if (indice > 0) setIndice((i) => i - 1);
  }

  if (loading) {
    return <main className="shell"><section className="loginCard"><p>Cargando instrumento…</p></section></main>;
  }

  if (error || !pregunta) {
    return (
      <main className="shell">
        <section className="loginCard" style={{maxWidth:'760px'}}>
          <div className="badge">ENCUESTAS · OLANCHO</div>
          <h1>Instrumento</h1>
          <p role="alert">{error || 'No se encontraron preguntas para esta encuesta.'}</p>
          <a className="back" href="/encuestas">← Volver a encuestas</a>
        </section>
      </main>
    );
  }

  const respuestaActual = respuestas[pregunta.orden];

  return (
    <main className="shell">
      <section className="loginCard" style={{maxWidth:'820px'}}>
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1 style={{fontSize:'32px'}}>{titulo}</h1>
        <p><strong>Pregunta {indice + 1} de {preguntas.length}</strong> · {progreso}%</p>
        <div style={{height:'8px',background:'#e5ece9',borderRadius:'999px',overflow:'hidden',margin:'12px 0 24px'}}>
          <div style={{height:'100%',width:`${progreso}%`,background:'#17634e'}} />
        </div>

        {pregunta.dimension && <p style={{color:'#647a74',fontSize:'14px'}}>Dimensión: {pregunta.dimension}</p>}
        {pregunta.condicional && <p style={{background:'#f7faf9',padding:'10px',borderRadius:'8px'}}><strong>Condición:</strong> {pregunta.condicional}</p>}
        <h2 style={{fontSize:'24px',lineHeight:1.3}}>{pregunta.texto}</h2>

        {opciones.length > 0 ? (
          <div style={{display:'grid',gap:'10px',marginTop:'20px'}}>
            {opciones.map((opcion) => {
              const texto = typeof opcion === 'string' ? opcion : (opcion?.label || opcion?.texto || JSON.stringify(opcion));
              return (
                <button
                  type="button"
                  key={texto}
                  onClick={() => responder(texto)}
                  style={{
                    width:'100%',
                    textAlign:'left',
                    background: respuestaActual === texto ? '#0f513f' : '#17634e'
                  }}
                >
                  {texto}
                </button>
              );
            })}
          </div>
        ) : pregunta.tipo_respuesta === 'TEXTO_CORTO' ? (
          <input
            value={respuestaActual || ''}
            onChange={(e) => responder(e.target.value)}
            placeholder="Escriba la respuesta"
            style={{width:'100%',padding:'13px',border:'1px solid #bdcbc6',borderRadius:'9px',fontSize:'16px',marginTop:'14px'}}
          />
        ) : (
          <p style={{color:'#647a74'}}>Tipo de respuesta: {pregunta.tipo_respuesta}</p>
        )}

        <div style={{display:'flex',gap:'12px',justifyContent:'space-between',marginTop:'28px',flexWrap:'wrap'}}>
          <button type="button" onClick={anterior} disabled={indice === 0} style={{width:'auto',opacity:indice===0?.45:1}}>ANTERIOR</button>
          {indice < preguntas.length - 1 ? (
            <button type="button" onClick={siguiente} style={{width:'auto'}}>SIGUIENTE</button>
          ) : (
            <button type="button" disabled style={{width:'auto',opacity:.55}}>FIN DEL INSTRUMENTO</button>
          )}
        </div>

        <p style={{marginTop:'22px',fontSize:'13px',color:'#647a74'}}>
          Vista operativa del instrumento. Las respuestas aún no se guardan como encuesta final desde este perfil administrativo.
        </p>
        <a className="back" href="/encuestas">← Volver a encuestas</a>
      </section>
    </main>
  );
}
