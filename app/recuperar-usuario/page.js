'use client';

export default function RecuperarUsuario(){
  return <main className="shell"><section className="loginCard">
    <div className="badge">ENCUESTAS · OLANCHO</div>
    <h1>Recuperar usuario</h1>
    <p>En Encuestas, tu <strong>usuario es el correo electrónico registrado</strong>.</p>
    <p>Si recuerdas tu correo, úsalo directamente para iniciar sesión o recuperar la contraseña.</p>
    <p>Si no recuerdas cuál correo fue registrado, solicita al Administrador General que verifique tu cuenta.</p>
    <a className="button" href="/recuperar-acceso">RECUPERAR CONTRASEÑA</a>
    <a className="back" href="/login">← Volver a iniciar sesión</a>
  </section></main>;
}
