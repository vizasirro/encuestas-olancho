export default function Login() {
  return (
    <main className="shell">
      <section className="loginCard">
        <div className="badge">ENCUESTAS · OLANCHO</div>
        <h1>Iniciar sesión</h1>
        <p>Acceso para usuarios autorizados del sistema de Encuestas.</p>
        <form>
          <label>Correo electrónico<input type="email" name="email" autoComplete="email" /></label>
          <label>Contraseña<input type="password" name="password" autoComplete="current-password" /></label>
          <button type="button">INGRESAR</button>
        </form>
        <a className="back" href="/">← Volver al inicio</a>
      </section>
    </main>
  );
}
