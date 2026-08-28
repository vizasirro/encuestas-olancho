export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="badge">OLANCHO · HONDURAS</div>
        <h1>Encuestas de Satisfacción</h1>
        <p className="lead">Evaluación de la experiencia de los usuarios de los servicios de salud.</p>
        <div className="card">
          <h2>Acceso al sistema</h2>
          <p>Plataforma independiente para aplicación, supervisión y análisis de encuestas.</p>
          <a className="button" href="/login">INGRESAR</a>
        </div>
        <p className="privacy">Las encuestas son anónimas. No se registra nombre, identidad, expediente clínico ni teléfono del paciente.</p>
      </section>
    </main>
  );
}
