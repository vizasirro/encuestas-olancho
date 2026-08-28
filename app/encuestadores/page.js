'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const vacio = {
  nombre:'', email:'', municipio:'', establecimiento_codigo:'', establecimiento_nombre:'',
  tipo_encuesta:'AMBULATORIA', hospital:false, es_externo_sesal:true
};

export default function EncuestadoresPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [rol, setRol] = useState('');
  const [form, setForm] = useState(vacio);
  const [creando, setCreando] = useState(false);
  const [cargandoEstablecimientos, setCargandoEstablecimientos] = useState(false);

  async function cargar() {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('listar_encuestadores_admin');
    if (rpcError) setError('No fue posible cargar los encuestadores.');
    else setItems(Array.isArray(data) ? data : []);
  }

  async function cargarMunicipios() {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('listar_municipios_encuestas');
    if (rpcError) { setError('No fue posible cargar los municipios.'); return; }
    setMunicipios((Array.isArray(data) ? data : []).map(x => x.municipio));
  }

  async function cargarEstablecimientos(municipio) {
    setEstablecimientos([]);
    if (!municipio) return;
    setCargandoEstablecimientos(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('listar_establecimientos_municipio_encuestas', { p_municipio: municipio });
    if (rpcError) setError('No fue posible cargar los establecimientos del municipio.');
    else setEstablecimientos(Array.isArray(data) ? data : []);
    setCargandoEstablecimientos(false);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: perfilData } = await supabase.rpc('obtener_mi_perfil');
      const perfil = Array.isArray(perfilData) ? perfilData[0] : null;
      if (!perfil || !['ADMIN_GENERAL','ADMIN_ENCUESTAS','JEFE_ENCUESTADORES'].includes(perfil.rol) || !perfil.activo) {
        router.replace('/panel'); return;
      }
      if (!active) return;
      setRol(perfil.rol);
      await Promise.all([cargar(), cargarMunicipios()]);
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  const soloConsulta = rol === 'JEFE_ENCUESTADORES';
  const puedeCrear = rol === 'ADMIN_GENERAL' || rol === 'ADMIN_ENCUESTAS';

  function cambia(campo, valor) { setForm(f => ({...f,[campo]:valor})); }

  async function seleccionarMunicipio(valor) {
    setForm(f => ({...f, municipio:valor, establecimiento_codigo:'', establecimiento_nombre:'', hospital:false}));
    setError('');
    await cargarEstablecimientos(valor);
  }

  function seleccionarEstablecimiento(codigo) {
    const seleccionado = establecimientos.find(x => x.codigo === codigo);
    if (!seleccionado) {
      setForm(f => ({...f, establecimiento_codigo:'', establecimiento_nombre:'', hospital:false}));
      return;
    }
    setForm(f => ({
      ...f,
      establecimiento_codigo: seleccionado.codigo,
      establecimiento_nombre: seleccionado.nombre,
      hospital: !!seleccionado.hospital
    }));
  }

  async function crearEncuestador(e) {
    e.preventDefault();
    setError(''); setMensaje(''); setCreando(true);
    if (!form.municipio || !form.establecimiento_codigo) {
      setError('Seleccione municipio y establecimiento u hospital.');
      setCreando(false); return;
    }
    const supabase = createClient();
    const { data, error: fnError } = await supabase.functions.invoke('crear-encuestador', { body: form });
    if (fnError || !data?.ok) {
      setError(data?.error || fnError?.message || 'No fue posible crear el encuestador.');
      setCreando(false); return;
    }
    setMensaje(`Encuestador creado correctamente. ID permanente: ${data.encuestador_id}. Se envió invitación al correo indicado.`);
    setForm(vacio);
    setEstablecimientos([]);
    await cargar();
    setCreando(false);
  }

  async function cambiarEstado(item) {
    const motivo = window.prompt(item.activo ? 'Motivo para inactivar al encuestador:' : 'Motivo para reactivar al encuestador:');
    if (motivo === null) return;
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('cambiar_estado_encuestador', {
      p_usuario_id:item.usuario_id, p_activo:!item.activo, p_motivo:motivo.trim() || null
    });
    if (rpcError) { setError(rpcError.message); return; }
    setMensaje(item.activo ? 'Encuestador inactivado.' : 'Encuestador reactivado.');
    await cargar();
  }

  async function reasignar(item) {
    const codigo = window.prompt('Nuevo código RUPS / código del establecimiento:', item.establecimiento_codigo || '');
    if (codigo === null) return;
    const nombre = window.prompt('Nuevo establecimiento u hospital:', item.establecimiento_nombre || '');
    if (nombre === null) return;
    const tipo = window.prompt('Tipo de encuesta: AMBULATORIA o HOSPITALIZACION', item.tipo_encuesta || 'AMBULATORIA');
    if (tipo === null) return;
    const hospital = window.confirm('¿La nueva asignación corresponde a un hospital?');
    const motivo = window.prompt('Motivo de la reasignación:');
    if (motivo === null) return;

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('reasignar_encuestador', {
      p_usuario_id:item.usuario_id,
      p_tipo_encuesta:tipo.trim().toUpperCase(),
      p_establecimiento_codigo:codigo.trim(),
      p_establecimiento_nombre:nombre.trim(),
      p_hospital:hospital,
      p_motivo:motivo.trim()
    });
    if (rpcError) { setError(rpcError.message); return; }
    setMensaje('Encuestador reasignado. La asignación anterior quedó conservada en el historial.');
    await cargar();
  }

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

        {puedeCrear && (
          <form onSubmit={crearEncuestador} style={{border:'2px solid #17634e',borderRadius:'14px',padding:'18px',margin:'20px 0'}}>
            <h2 style={{marginTop:0}}>Crear encuestador</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'12px'}}>
              <label>Nombre completo<input required value={form.nombre} onChange={e=>cambia('nombre',e.target.value)} style={{width:'100%',padding:'11px',marginTop:'5px'}} /></label>
              <label>Correo electrónico<input required type="email" value={form.email} onChange={e=>cambia('email',e.target.value)} style={{width:'100%',padding:'11px',marginTop:'5px'}} /></label>
              <label>Municipio
                <select required value={form.municipio} onChange={e=>seleccionarMunicipio(e.target.value)} style={{width:'100%',padding:'11px',marginTop:'5px'}}>
                  <option value="">Seleccione municipio</option>
                  {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label>Unidad de salud u hospital
                <select required disabled={!form.municipio || cargandoEstablecimientos} value={form.establecimiento_codigo} onChange={e=>seleccionarEstablecimiento(e.target.value)} style={{width:'100%',padding:'11px',marginTop:'5px'}}>
                  <option value="">{cargandoEstablecimientos ? 'Cargando…' : 'Seleccione establecimiento'}</option>
                  {establecimientos.map(es => <option key={es.codigo} value={es.codigo}>{es.hospital ? 'HOSPITAL · ' : `${es.tipo} · `}{es.nombre}{es.hospital ? '' : ` · RUPS ${es.codigo}`}</option>)}
                </select>
              </label>
              <label>Tipo de encuesta<select value={form.tipo_encuesta} onChange={e=>cambia('tipo_encuesta',e.target.value)} style={{width:'100%',padding:'11px',marginTop:'5px'}}><option value="AMBULATORIA">Atención Ambulatoria</option><option value="HOSPITALIZACION">Hospitalización / Internamiento</option></select></label>
            </div>
            {form.establecimiento_codigo && <p style={{fontSize:'13px',color:'#647a74',margin:'10px 0 0'}}><strong>Asignación:</strong> {form.establecimiento_nombre}{form.hospital ? ' · Hospital' : ` · RUPS ${form.establecimiento_codigo}`}</p>}
            <label style={{display:'block',marginTop:'10px',fontWeight:700}}><input type="checkbox" required checked={form.es_externo_sesal} onChange={e=>cambia('es_externo_sesal',e.target.checked)} /> Confirmo que el encuestador es externo a la Secretaría de Salud</label>
            <button type="submit" disabled={creando || !form.es_externo_sesal || !form.establecimiento_codigo} style={{marginTop:'16px',width:'100%'}}>{creando ? 'CREANDO…' : 'CREAR ENCUESTADOR'}</button>
            <p style={{fontSize:'13px',color:'#647a74'}}>El municipio determina automáticamente las unidades disponibles. El código RUPS se carga desde el catálogo independiente de Encuestas; los hospitales usan su identificador interno del sistema.</p>
          </form>
        )}

        {mensaje && <p role="status" style={{background:'#eef7f3',border:'1px solid #9fcdbd',padding:'12px',borderRadius:'10px'}}><strong>{mensaje}</strong></p>}
        {loading && <p>Cargando…</p>}
        {error && <p role="alert" style={{background:'#fff1f0',border:'1px solid #d99',padding:'12px',borderRadius:'10px'}}>{error}</p>}

        {!loading && !error && items.length === 0 && <div style={{border:'1px dashed #bdcbc6',borderRadius:'12px',padding:'18px',margin:'18px 0'}}><strong>Aún no hay encuestadores asignados.</strong><p style={{marginBottom:0}}>Use “Crear encuestador” para registrar el primero.</p></div>}

        {!loading && items.map((item) => (
          <div key={`${item.usuario_id}-${item.encuestador_id}-${item.fecha_asignacion}`} style={{border:'1px solid #dce6e2',borderRadius:'12px',padding:'16px',margin:'14px 0'}}>
            <p style={{margin:'0 0 6px'}}><strong>{item.nombre || 'Encuestador'}</strong> · {item.encuestador_id}</p>
            <p style={{margin:'6px 0'}}><strong>Asignación:</strong> {item.establecimiento_nombre} {item.hospital ? '(Hospital)' : ''}</p>
            <p style={{margin:'6px 0'}}><strong>Código:</strong> {item.establecimiento_codigo}</p>
            <p style={{margin:'6px 0'}}><strong>Tipo:</strong> {item.tipo_encuesta === 'AMBULATORIA' ? 'Atención Ambulatoria' : 'Hospitalización / Internamiento'}</p>
            <p style={{margin:'6px 0'}}><strong>Externo a SESAL:</strong> {item.es_externo_sesal ? 'Sí' : 'No'}</p>
            <p style={{margin:'6px 0'}}><strong>Estado:</strong> {item.activo ? 'Activo' : 'Inactivo'}</p>
            {!soloConsulta && <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'12px'}}><button type="button" onClick={()=>cambiarEstado(item)} style={{width:'auto',background:item.activo?'#8f2f2f':'#17634e'}}>{item.activo?'INACTIVAR':'REACTIVAR'}</button>{rol === 'ADMIN_GENERAL' && <button type="button" onClick={()=>reasignar(item)} style={{width:'auto'}}>REASIGNAR</button>}</div>}
          </div>
        ))}

        <a className="back" href="/panel">← Volver al panel</a>
      </section>
    </main>
  );
}
