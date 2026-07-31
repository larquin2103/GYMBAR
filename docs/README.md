# GYMBAR · Paquete de diseño y arquitectura

Plataforma SaaS profesional para la administración integral de gimnasios.
Objetivo de experiencia: velocidad y claridad comparables a Linear, Stripe
Dashboard, Notion y Vercel.

> **Estado:** diseño previo al código. Regla del proyecto: no se escribe código
> de aplicación sin la arquitectura correspondiente aprobada. Cada fase requiere
> aprobación explícita antes de continuar.

## Índice de documentos

| #   | Documento                                                                 | Entregables del brief |
| --- | ------------------------------------------------------------------------- | --------------------- |
| 00  | [Investigación y benchmark](./00-research-benchmark.md)                   | 1, 2                  |
| 01  | [MVP y roadmap](./01-product-mvp-roadmap.md)                              | 3                     |
| 02  | [Arquitectura del sistema](./02-architecture.md)                          | 4                     |
| 03  | [Modelo de dominio](./03-domain-model.md)                                 | 5                     |
| 04  | [Modelo de datos Firestore + escalabilidad](./04-firestore-data-model.md) | 6, 17                 |
| 05  | [Roles, permisos y seguridad](./05-roles-security.md)                     | 7, 16                 |
| 06  | [Flujos de usuario y navegación](./06-user-flows-navigation.md)           | 8, 9                  |
| 07  | [Sistema de diseño y guía UX/UI](./07-design-system.md)                   | 10, 11                |
| 08  | [Arquitectura del frontend](./08-frontend-architecture.md)                | 12                    |
| 09  | [Arquitectura del backend](./09-backend-architecture.md)                  | 13                    |
| 10  | [Offline, sincronización y PWA](./10-offline-sync-pwa.md)                 | 14, 15                |
| 11  | [Estrategia de pruebas](./11-testing-strategy.md)                         | 18                    |
| 12  | [Plan de implementación por fases](./12-implementation-plan.md)           | 19, 20                |

## Stack

React · TypeScript · Vite · TailwindCSS · React Router · React Hook Form · Zod ·
TanStack Query · Firebase (Auth, Firestore, Storage, Cloud Functions, Cloud
Messaging, Hosting) · PWA.

## Decisiones no negociables (resumen ejecutivo)

1. **Multi-tenant estructural** por subcolecciones bajo `/organizations/{orgId}`
   - custom claims; el aislamiento no depende de disciplina del programador.
2. **Server-authoritative:** pagos, cierre de caja, roles y contadores viven en
   Cloud Functions; el cliente nunca es fuente de verdad para dinero ni permisos.
3. **Offline selectivo:** check-in/asistencia offline; el dinero requiere
   conexión. Cero cobros fantasma.
4. **Dashboard y reportes por rollups precomputados**, no por `count()` en
   caliente — el modelo de costos de Firestore lo exige a escala.
5. **Clean Architecture + Repository Pattern:** el dominio no conoce Firebase; el
   vendor lock-in queda aislado en una capa.
