# VIGILANCIA OLANCHO

## Notificación obligatoria del sector privado

Documento operativo de continuidad. Versión: 19 de septiembre de 2026.

## 1. Propósito

Registrar la notificación semanal obligatoria de clínicas y hospitales privados de Olancho, recibir alertas inmediatas de enfermedades configuradas en categoría roja, dar seguimiento a fichas epidemiológicas y listas nominales, y generar evidencia auditable de cumplimiento.

## 2. Responsables

| Actividad | Responsable principal | Suplente o escalamiento | Evidencia esperada | Criterio de cumplimiento |
|---|---|---|---|---|
| Concertar reunión con clínica | Gestor de Usuarios / Departamento de Redes | Jefatura de Redes | Minuta, fecha y datos del jefe o delegado | Datos completos antes de crear el acceso |
| Registrar clínica y generar QR/PIN | Gestor de Usuarios | Administrador General | Registro en sistema y credencial emitida | Clínica activa con código único |
| Crear responsable de monitoreo | Gestor de Usuarios | Administrador General | Usuario, rol, clínica y correo asociados | Primer ingreso obliga cambio de contraseña |
| Remitir instructivo y credenciales | Cuenta oficial del Departamento de Redes | Gestor de Usuarios | Correo en cola/enviado | Correo al responsable previamente registrado |
| Enviar boletín semanal | Clínica privada | Jefe o delegado de la clínica | Boletín con todas las casillas completas | Recibido antes del lunes siguiente a las 8:00 a. m. |
| Notificar enfermedad roja | Clínica privada | Jefe o delegado | Evento inmediato e ID de paciente | Alerta registrada sin duplicidad y acumulada en el boletín |
| Enviar lista nominal o ficha | Clínica privada | Responsable de clínica | Correo con anexos y asunto normado | Correo enviado; conservación local de 13 meses |
| Confirmar ficha/lista | Vigilancia Epidemiológica Regional | Administrador General | Estado recibida, corrección o validada | Pendiente solo se elimina al validar |
| Cerrar semana | Sistema automático | Vigilancia Epidemiológica | Cierre, cumplimiento y correo en cola | Lunes 8:00 a. m., hora de Honduras |
| Corregir boletín cerrado | Epidemióloga o Administrador General | No delegable | Motivo, antes/después, fecha y usuario | Auditoría completa de la modificación |
| Revisar incumplimientos | Vigilancia Epidemiológica | Jefatura Regional, solo por excepción | Listado de no notificaron y acciones | Excepciones escaladas; rutina resuelta sin Jefatura Regional |

## 3. Flujo de incorporación

1. El Gestor concierta reunión con el jefe de la clínica o su delegado.
2. Obtiene nombre legal, tipo, municipio, dirección, teléfonos, correos, jefe, delegado, licencia sanitaria y evidencia de la reunión.
3. Registra la clínica en `Clínicas y accesos`.
4. El sistema genera QR único y PIN de cuatro dígitos con almacenamiento cifrado mediante hash.
5. El Gestor crea el usuario responsable de la clínica.
6. El sistema genera una contraseña temporal; el primer ingreso exige cambiarla.
7. Las credenciales quedan en cola para envío desde la cuenta oficial del Departamento de Redes.
8. La clínica prueba acceso, alerta inmediata y boletín antes de declararse habilitada.

## 4. Notificación semanal

- Todas las casillas inician en cero.
- Solo aceptan números enteros iguales o mayores que cero.
- La notificación es obligatoria incluso cuando todo sea cero.
- Un caso enviado previamente como alerta inmediata permanece acumulado y no puede reducirse en el boletín.
- El cierre ocurre el lunes siguiente a las 8:00 a. m., hora de Honduras.
- El sistema registra `NOTIFICÓ` o `NO NOTIFICÓ` por clínica y semana.

## 5. Alertas inmediatas

- Se registran en cualquier momento usando el QR y PIN de la clínica.
- Requieren enfermedad e ID del paciente; no se escribe el nombre en la alerta.
- El mismo paciente, enfermedad, clínica y semana no se duplica.
- El caso incrementa automáticamente el acumulado de la semana.
- Si la enfermedad requiere ficha, el seguimiento queda `PENDIENTE` hasta validación por Vigilancia.
- Las alertas se distribuyen exclusivamente por correo electrónico a los actores configurados según cobertura.

## 6. Fichas y lista nominal

- La plataforma no sustituye la ficha oficial de SESAL.
- La clínica descarga la ficha oficial, la llena y la remite al correo indicado.
- El asunto debe incluir código de la clínica y semana epidemiológica.
- La lista nominal usa una fila por paciente e incluye el teléfono del paciente o responsable.
- Estados: `PENDIENTE`, `RECIBIDA`, `REQUIERE_CORRECCIÓN`, `VALIDADA` y, para lista nominal, `NO APLICA`.
- La clínica conserva durante 13 meses el correo enviado, anexos y correcciones.
- La Región conserva los registros operativos durante 10 años; los consolidados anónimos pueden conservarse permanentemente.

## 7. Accesos y seguridad

- Administrador General: control total y eliminación autorizada.
- Gestor de Usuarios: alta, QR, PIN, usuarios, activación y suspensión.
- Vigilancia Regional: seguimiento, recepción, corrección y validación.
- Regional, ECOR, Municipal y Auditor: consulta según cobertura.
- Responsable de Clínica: acceso a su clínica y cambio de PIN con confirmación por correo.
- Las tablas no admiten lectura directa anónima ni autenticada; toda operación sensible pasa por el servidor.
- El PIN nunca se almacena en texto claro.
- Cinco intentos fallidos en quince minutos bloquean temporalmente el acceso de la clínica.

## 8. Evidencia para cierre antes del viaje

| Pendiente externo | Responsable | Plazo | Evidencia | Criterio de cierre |
|---|---|---|---|---|
| Autorizar Vercel/GitHub correctos | Titular de la cuenta `vizasirro` | Antes del 23-sep-2026 | Equipo SIRRO visible | Se publica sin usar la cuenta equivocada |
| Configurar correo de Redes | Departamento de Redes / TI | Antes de piloto | Remitente verificado y prueba recibida | Credenciales, alertas y cierre llegan por correo |
| Cargar fichas oficiales SESAL | Vigilancia Epidemiológica | Antes de habilitar cada enfermedad | URL o archivo oficial por enfermedad | Descarga funcional desde la página de fichas |
| Confirmar clasificación roja | Vigilancia Epidemiológica / SESAL | Antes del piloto | Catálogo aprobado | Alertas coinciden con norma vigente y alerta activa |
| Recibir censo con licencia sanitaria | Marco Normativo | Al recibir listado | Registro oficial fechado | Se concilia con censo provisional y se excluye Hermano Pedro |
| Ejecutar prueba integral | Gestor + Vigilancia + clínica piloto | Antes de apertura general | Capturas/correos y resultado documentado | QR, PIN, alerta, boletín, ficha, cierre y descarga funcionan |

## 9. Criterio de escalamiento durante vacaciones

No se consulta a la Jefatura Regional por tareas rutinarias. Solo se eleva:

1. indisponibilidad general o pérdida de datos;
2. alerta inmediata sin entrega de correo;
3. incumplimiento persistente después del seguimiento ordinario;
4. solicitud de modificar un boletín cerrado fuera de los perfiles autorizados;
5. decisión normativa o institucional que requiera autoridad regional.
