# 00 · Investigación de mercado y Benchmark

> Entregables 1 y 2. Base de evidencia para todas las decisiones posteriores.
> Fecha: 2026-07-31 · Estado: **Propuesta para aprobación**

## 1. Contexto del problema

El software de gestión de gimnasios rara vez falla por falta de funcionalidades:
falla por **fricción operativa**. El usuario real (recepcionista) opera bajo tres
restricciones que definen todo el producto:

1. **Alta frecuencia, baja atención.** Registra decenas de entradas por hora,
   muchas veces con una cola de personas esperando. Cada segundo y cada clic
   cuentan literalmente.
2. **Rotación de personal alta.** El software debe aprenderse sin capacitación.
   Si necesita un manual, ya perdió.
3. **Conectividad no garantizada.** Muchos gimnasios tienen WiFi inestable. El
   registro de entrada **no puede** depender de la red.

Estas tres restricciones — no la lista de módulos — son las que ordenan las
prioridades de arquitectura y UX de este proyecto.

## 2. Mejores prácticas actuales (SaaS de gestión, 2025-2026)

| Práctica                                               | Por qué                                                                          | Cómo se aplica aquí                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Command palette (Cmd/Ctrl-K)** como entrada primaria | Reduce navegación a cero clics para usuarios frecuentes (Linear, Notion, Stripe) | Búsqueda global de clientes + acciones ("Registrar pago", "Abrir caja")     |
| **Optimistic UI** en acciones frecuentes               | Feedback < 100 ms percibido como instantáneo                                     | Check-in y asistencia se pintan antes de confirmar servidor                 |
| **Server-driven authorization**                        | Nunca confiar en el cliente                                                      | Firestore Rules + Custom Claims + Cloud Functions para mutaciones sensibles |
| **Multi-tenant desde día 1**                           | Reescribir aislamiento después es catastrófico                                   | `organizationId` en claim + datos bajo `/organizations/{orgId}/...`         |
| **Precomputed aggregates**                             | Firestore cobra por documento leído; los reportes matan el costo                 | Contadores/rollups mantenidos por Cloud Functions, no `count()` en caliente |
| **Design tokens + modo oscuro nativo**                 | Consistencia y percepción de calidad                                             | Sistema de tokens en CSS variables + Tailwind theme                         |
| **Offline-first selectivo**                            | No todo debe ser offline; el dinero sí debe ser online                           | Check-in/asistencia offline; pagos/caja requieren conexión (ver §Riesgos)   |
| **Skeletons + empty states útiles**                    | Percepción de velocidad y guía sin capacitación                                  | Cada lista y ficha con su skeleton y su empty state accionable              |

## 3. Benchmark de plataformas líderes

Análisis de referentes directos (gimnasios) y de referentes de **calidad de
experiencia** (SaaS generalistas que el brief pide igualar).

### Referentes del dominio (gimnasios)

**Mindbody**

- Fortalezas: ecosistema enorme, reservas, marketplace de descubrimiento.
- Debilidades: **pesado y lento**, UI sobrecargada, curva de aprendizaje alta,
  caro. Es el anti-ejemplo de "usable sin capacitación".

**Glofox**

- Fortalezas: enfoque móvil, onboarding decente, buen manejo de membresías.
- Debilidades: reporting limitado, personalización rígida, precio elevado.

**Trainerize / TrueCoach**

- Fortalezas: excelente experiencia de rutinas/coaching y seguimiento de cliente.
- Debilidades: **no son sistemas de administración/recepción**; débiles en caja,
  inventario y operación de mostrador.

**PushPress / Wodify (nicho CrossFit)**

- Fortalezas: check-in ágil, buena operación de front-desk.
- Debilidades: muy centrados en su nicho; reporting y multi-sede limitados.

**Software local/regional (los que realmente compiten en LATAM)**

- Fortalezas: baratos, en español, resuelven lo básico (clientes, pagos, caja).
- Debilidades: **UX de los 2000**, sin PWA/offline real, sin multi-tenant serio,
  sin modo oscuro, formularios enormes, cero microinteracciones. **Aquí está la
  oportunidad de mercado.**

### Referentes de experiencia (a igualar, no copiar)

- **Linear** → command palette, velocidad percibida, atajos de teclado, keyboard-first.
- **Stripe Dashboard** → jerarquía de datos financieros, estados visuales claros,
  tablas densas pero legibles, reporting limpio.
- **Notion** → empty states, onboarding progresivo, densidad ajustable.
- **Vercel / Supabase Studio** → tokens de diseño, modo oscuro impecable, dashboards accionables.
- **Stripe/Shopify** → flujos de cobro y confirmaciones "solo cuando importan".

## 4. Conclusiones que ordenan el producto

1. **El diferenciador no es la lista de módulos** (todos la tienen). Es la
   **velocidad de operación de mostrador** + **calidad de experiencia** +
   **precio/simplicidad**. Ese es el posicionamiento.
2. **El check-in es la función crítica.** Debe funcionar offline, en < 10 s, sin
   capacitación. Todo lo demás se subordina a esto.
3. **El dinero es sagrado.** Pagos y caja exigen integridad transaccional y
   servidor. No se resuelven con "optimistic offline" ingenuo.
4. **Multi-tenant y seguridad se diseñan antes del primer `write`.** Corregir
   fugas de datos entre gimnasios en producción destruye la confianza del producto.
5. **El reporting debe diseñarse contra el modelo de costos de Firestore**, no
   como un `SELECT COUNT(*)`. Si no, el margen del SaaS se evapora a escala.
