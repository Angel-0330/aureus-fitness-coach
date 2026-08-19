# Organización de Aureus

La aplicación está separada por responsabilidad para que cada cambio tenga un lugar claro.

## Núcleo

- `types.ts`: modelos compartidos de cuentas, clientes, planes, rutinas y progreso.
- `data.ts`: datos iniciales, navegación y configuración de cada rol.
- `utils.ts`: funciones puras de formato y creación de borradores.
- `app-shell.tsx`: navegación, estado general y coordinación entre módulos.

## Componentes compartidos

- `components/shared.tsx`: marca, modales, tablas, indicadores y piezas reutilizables.

## Funciones de negocio

- `features/auth.tsx`: inicio de sesión, registro y recuperación de acceso.
- `features/dashboards.tsx`: paneles principales del dueño, recepción y entrenador.
- `features/management.tsx`: clientes, entrenadores, pagos, planes, equipo y agenda.
- `features/training.tsx`: rutinas y seguimiento del progreso.
- `features/people.tsx`: registro y fichas detalladas de clientes y entrenadores.
- `features/settings.tsx`: cuentas del equipo y preferencias visuales.

## Punto de entrada

`app/page.tsx` únicamente inicia la aplicación, conserva la sesión activa y entrega el estado global a `AppShell`.

Para añadir o modificar una función, comienza en el archivo de `features` que corresponda. Coloca una pieza en `components/shared.tsx` solo cuando sea reutilizada por más de un área.
