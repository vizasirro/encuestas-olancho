import Image from 'next/image';

export default function VigilanciaHome() {
  return <main className="vig-shell"><div className="vig-wrap" style={{maxWidth:'820px'}}>
    <header className="vig-header"><div className="vig-brand">
      <Image src="/viza-logo.svg" alt="Región Sanitaria de Olancho" width={84} height={84}/>
      <div><span className="vig-badge">REGIÓN SANITARIA DE OLANCHO</span><h1>VIGILANCIA OLANCHO</h1><p>Notificación obligatoria del sector privado</p></div>
    </div></header>
    <section className="vig-card"><h2>Acceso institucional</h2><p>Plataforma para notificación semanal, alertas inmediatas, seguimiento de fichas epidemiológicas y boletines.</p>
      <div className="vig-actions"><a className="vig-button" href="/vigilancia/login">INGRESAR AL PANEL</a></div>
    </section>
    <section className="vig-card"><h2>¿Representa a una clínica?</h2><p>Abra el enlace contenido en el código QR asignado a su establecimiento e ingrese el código de cuatro dígitos.</p><p className="vig-note">La notificación semanal es obligatoria, incluso cuando todos los valores sean cero. Las enfermedades en alerta se notifican inmediatamente.</p></section>
  </div></main>;
}
