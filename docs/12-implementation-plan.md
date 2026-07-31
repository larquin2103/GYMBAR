# 12 · Plan de implementación por fases

> Entregables 19 y 20. Nada de código de aplicación hasta aprobar la fase.

## Regla de gobierno

Cada fase termina con un **hito verificable** y **requiere aprobación explícita**
antes de continuar (regla del brief: "Solo después de aprobar cada etapa,
comenzar el desarrollo"). Este documento es el contrato de avance.

## Fase 0 — Fundaciones (sin lógica de negocio)

**Objetivo:** que la maquinaria exista y arranque, con la calidad ya cableada.

- Monorepo: `app/` (Vite+React+TS), `functions/`, `packages/shared` (schemas Zod
  compartidos), `docs/`.
- Tooling: TypeScript estricto, ESLint, Prettier, Vitest, Playwright, Husky.
- Tailwind + tokens del design system (doc 07) + modo claro/oscuro.
- Design system base: `Button, Input, Sheet, Dialog, Toast, Badge, Table,
  Skeleton, EmptyState, CommandPalette, PageHeader`.
- Shell de la app: layout, sidebar, router (rutas vacías), command palette,
  indicador de conectividad.
- Firebase: init del SDK, Emulator Suite, `firebase.json`, esqueleto de Rules +
  tests de aislamiento (aún sin datos reales).
- PWA: manifest + service worker (Workbox) base, instalable.
- CI: pipeline lint→typecheck→test→build→rules-tests.

**Hito:** la app instala como PWA, cambia de tema, abre la command palette y el CI
pasa en verde. Cero funcionalidad de negocio todavía.

## Fase 1 — Identidad, multi-tenant y clientes

- Auth (login), Custom Claims vía `setUserRole`, `onOrganizationCreated`
  (bootstrap del tenant + primer admin), guard de rutas por rol.
- Repositorios y hooks de `member`; Rules de `members` + tests.
- Alta de cliente (sheet inteligente), lista con búsqueda instantánea y
  paginación por cursor, ficha moderna (doc: foto, estado, notas), Storage para
  fotos.

**Hito:** un admin crea su gimnasio, invita una recepción, registra clientes y los
busca al instante; aislamiento entre orgs verificado por tests.

## Fase 2 — Núcleo operativo (cierra el MVP)

- Planes y membresías (máquina de estados, freeze, renovación) + `onMembershipWrite`.
- **Check-in offline-first** (el flujo crítico, doc 06/10).
- Pagos (`createPayment` transaccional e idempotente) + recibo PDF.
- Caja (apertura cliente, `closeCashSession` server-side que cuadra).
- Dashboard con contadores precomputados (`updateCounters`).

**Hito (MVP vendible):** un gimnasio opera el mostrador completo — registra,
cobra, hace check-in con red caída y cierra caja cuadrada. Cumple la Definition
of Done del doc 01.

## Fase 3 — Retención y análisis

- Asistencia (historial + estadística semanal) sobre datos particionados por día.
- Reportes exportables (PDF/Excel) server-side con filtros rápidos.
- Notificaciones de vencimiento (FCM + scheduled function).

## Fase 4 — Coaching y stock

- Rutinas (asignación por entrenador), medidas corporales (histórico + progreso).
- Inventario, productos y punto de venta simple integrado a caja.

## Fase 5 — Escala y automatización (futuro)

- Renovación/cobro automático (pasarela de pago), multi-sede por organización,
  multi-org por usuario, portal/PWA del cliente, reservas de clases, export a
  BigQuery para analítica pesada.

## Estimación indicativa

| Fase | Alcance | Duración indicativa |
|---|---|---|
| 0 | Fundaciones | ~1 semana |
| 1 | Identidad + clientes | ~2 semanas |
| 2 | Núcleo operativo (MVP) | ~2-3 semanas |
| 3 | Retención + reportes | ~2 semanas |
| 4 | Coaching + stock | ~2-3 semanas |
| 5 | Escala | continuo |

> Las estimaciones son de referencia para 1 desarrollador senior full-stack;
> escalan con el equipo. La prioridad declarada del brief es **calidad > cantidad
> de features**: cada fase se cierra bien antes de abrir la siguiente.
