# Qué se protegió, y cómo (explicado simple)

| Pediste | Cómo quedó resuelto |
|---|---|
| Backend funcional | Base de datos Postgres en Supabase + esquema completo (`db/schema.ts`) que refleja todos los módulos de tu demo (clientes, pagos, agenda, entrenadores, rutinas, expedientes médicos). |
| No depender de tu equipo | Todo corre sobre servicios administrados (Supabase, Cloudflare, Upstash): ellos mantienen servidores, backups, parches de seguridad y escalado. Tú administras configuración desde paneles web, no infraestructura. |
| Escalado horizontal | Cloudflare Workers escala automáticamente creando más instancias según la demanda (sin límite práctico para un gimnasio o cadena de gimnasios). Supabase permite sumar réplicas de lectura si el negocio crece mucho. |
| Límite de peticiones a las APIs | `lib/rate-limit.ts` limita cuántas veces puede llamar cada usuario a las rutas sensibles (20/min en datos médicos, 60/min en general, 5/min en login). Capa extra opcional sin código en Cloudflare cuando tengas dominio propio. |
| Seguridad médica reforzada | Ver detalle abajo. |
| Fácil de migrar en el futuro | Todo el modelo de datos es Postgres estándar vía Drizzle ORM — no hay ninguna función "exclusiva" de Supabase en el esquema. El día que quieras moverte a AWS RDS, Neon, o un servidor propio, exportas la base de datos y solo cambias `DATABASE_URL`. |

## Capas de seguridad para el módulo médico (de afuera hacia adentro)

1. **Autenticación real** (Supabase Auth) — ya no hay contraseñas en texto plano en el código; cada persona tiene su propia sesión verificada.
2. **Límite de peticiones** — dificulta que alguien intente extraer datos en masa.
3. **Row Level Security (RLS)** — la base de datos, no la aplicación, decide qué fila puede ver cada quien. Aunque haya un error en el código del frontend, la base de datos igual bloquea el acceso indebido.
4. **Aislamiento por rol** — la secretaria nunca puede ver diagnósticos ni medicamentos; solo el dueño y el entrenador/clínico asignado a ese cliente específico.
5. **Cifrado de campo adicional** — el número de cédula se cifra antes de guardarse, con una llave que solo existe en tus secretos de servidor.
6. **Cifrado en reposo y en tránsito** — automático por Supabase (disco) y HTTPS (red).
7. **Auditoría automática** — cada lectura/escritura al expediente médico queda registrada sola (quién, cuándo, qué acción), sin que el código tenga que acordarse de hacerlo.
8. **Sin borrado accidental** — los expedientes médicos no se pueden eliminar desde la aplicación ni por error de código; solo de forma manual y controlada.

## Lo que falta para estar 100% listos (siguientes pasos sugeridos)

- Migrar cada pantalla de `app/aureus/features/*.tsx` para leer/escribir contra Supabase en vez de los datos de prueba.
- Activar autenticación multifactor (MFA) para las cuentas de rol "owner" — se configura desde el panel de Supabase Auth en un par de clics.
- Si en algún momento vendes a clientes fuera de Panamá (ej. EE. UU.), revisar el cumplimiento con HIPAA además de la Ley 81 de Panamá.
- Una revisión de seguridad externa (pentest) antes de manejar datos médicos reales de muchos gimnasios a la vez — no es urgente para el lanzamiento inicial, pero sí antes de escalar.
