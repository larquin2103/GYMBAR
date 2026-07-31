# 01 · MVP y Roadmap evolutivo

> Entregable 3. Define qué se construye primero y por qué.

## Principio rector

> **El MVP no es "todos los módulos a medias". Es el circuito de mostrador
> perfecto, más lo mínimo para cobrar.**

Un gimnasio adopta el software el día 1 si puede: **registrar clientes, cobrar,
y hacer check-in rápido**. Todo lo demás (rutinas, inventario, reportes
avanzados) puede llegar después sin bloquear la adopción.

## MVP (Fase 1 + 2) — "Operar el mostrador"

Alcance mínimo para que un gimnasio real **reemplace su sistema actual**:

| Módulo                  | Alcance MVP                                                         | Justificación                     |
| ----------------------- | ------------------------------------------------------------------- | --------------------------------- |
| **Auth + Multi-tenant** | Login, roles (Admin/Recepción), aislamiento por org                 | Sin esto no hay producto vendible |
| **Clientes**            | Alta, ficha, búsqueda instantánea, foto, estado                     | Núcleo del dato                   |
| **Membresías**          | Planes (mensual/semanal/diaria/anual), asignar, vencimiento         | Sin membresía no hay negocio      |
| **Check-in**            | Búsqueda (nombre/tel/código/QR) + validación + registro **offline** | La función crítica                |
| **Pagos**               | Registrar pago, método, recibo, historial                           | Sin esto no cobran                |
| **Caja**                | Apertura/cierre, ingresos/egresos, resumen del día                  | Cierre diario = confianza         |
| **Dashboard**           | 6-7 indicadores accionables                                         | Da sentido de control             |

Fuera del MVP explícitamente: rutinas, medidas, inventario/productos avanzados,
reportes exportables complejos, notificaciones push, renovación automática,
portal del cliente.

## Roadmap por fases

**Fase 0 — Fundaciones (semana 0-1)**
Monorepo, tooling, design system base, Firebase project, CI/CD, reglas de
seguridad esqueleto, capa de datos (repositories), shell de la app (layout,
navegación, command palette).

**Fase 1 — Identidad y clientes (semana 2-3)**
Auth, claims, multi-tenant, onboarding de organización, CRUD clientes con ficha
moderna, búsqueda instantánea, subida de foto a Storage.

**Fase 2 — Núcleo operativo (semana 4-6)**
Membresías, planes, check-in offline-first, pagos, caja, dashboard. **Fin del MVP.**

**Fase 3 — Retención y análisis (semana 7-9)**
Asistencia (historial y estadística), reportes (PDF/Excel), notificaciones de
vencimiento (Cloud Messaging), estados avanzados.

**Fase 4 — Coaching y stock (semana 10-12)**
Rutinas, medidas corporales, inventario y productos, punto de venta simple.

**Fase 5 — Escala y automatización (futuro)**
Renovación automática, cobros recurrentes, multi-sede por organización,
portal/PWA del cliente, reservas de clases, integración de pasarela de pago,
BigQuery export para analítica pesada.

## Criterios de "listo para vender" (Definition of Done del MVP)

- [ ] Un gimnasio nuevo puede auto-registrarse y operar en < 15 min sin soporte.
- [ ] Check-in funciona con WiFi caído y sincroniza al volver.
- [ ] Cero fugas de datos entre organizaciones (verificado con tests de reglas).
- [ ] Cierre de caja cuadra al centavo con los pagos del día.
- [ ] Lighthouse PWA installable + performance > 90 en desktop.
- [ ] Instalable en Android, Windows, Mac, Linux y tablet.
