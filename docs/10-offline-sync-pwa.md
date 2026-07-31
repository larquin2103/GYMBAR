# 10 · Estrategia offline, sincronización y PWA

> Entregables 14 y 15. La decisión más delicada del producto.

## 1. Principio: offline SELECTIVO, no total

> **No todo debe funcionar offline. El dinero, no.** Permitir cobros y cierres de
> caja offline con reconciliación ingenua es la vía rápida a descuadres,
> duplicados y pérdida de confianza contable. Esta es una decisión deliberada y
> **no negociable** por conveniencia.

| Operación                          | Offline | Estrategia                                                                                        |
| ---------------------------------- | :-----: | ------------------------------------------------------------------------------------------------- |
| **Check-in / asistencia**          |  ✔ Sí   | Núcleo offline. Optimista + cola de sincronización.                                               |
| Leer clientes / membresías / ficha |  ✔ Sí   | Persistencia local de Firestore (caché).                                                          |
| Buscar cliente                     |  ✔ Sí   | Búsqueda sobre datos cacheados.                                                                   |
| **Registrar pago**                 |  ✖ No*  | Requiere conexión. Si no hay red → cola explícita "pendiente de cobro" visible, nunca silenciosa. |
| **Abrir/cerrar caja**              |  ✖ No   | Operación server-side (Function). Requiere conexión.                                              |
| Cambios de rol / config            |  ✖ No   | Sensible, online.                                                                                 |

\* Si el gimnasio pierde red durante un cobro, la UI lo deja **explícitamente
pendiente** y bloquea el cierre de caja hasta reconciliar. Transparencia total,
cero cobros "fantasma".

## 2. Cómo funciona el offline del check-in

1. Firestore **persistence** (IndexedDB) mantiene en caché los members y
   membresías del gym → la validación de acceso es **local e instantánea**.
2. El check-in se registra con **escritura optimista**; Firestore encola la
   mutación y la envía sola al recuperar red.
3. Cada check-in lleva un **id determinista** (client-generated) →
   **idempotente**: reintentos no duplican.
4. Los contadores del dashboard se reconcilian vía Cloud Function al llegar la
   escritura, no en el cliente.

## 3. Service Worker (Workbox)

- **App shell:** `precache` de assets con hashing → carga inicial instantánea.
- **Navegación:** `NetworkFirst` con fallback a shell cacheado.
- **Assets estáticos (JS/CSS/fuentes/iconos):** `CacheFirst` con expiración.
- **Imágenes (fotos):** `StaleWhileRevalidate` con límite de entradas.
- **Datos Firestore:** los maneja el SDK (no el SW) para no duplicar caché.

## 4. Actualizaciones silenciosas

- El SW detecta nueva versión → precachea en background.
- Se aplica en la **siguiente navegación** o con un toast discreto "Nueva versión
  disponible · Actualizar", sin interrumpir la operación de mostrador.
- Versionado de assets → cero riesgo de mezclar bundles.

## 5. PWA instalable

- `manifest.webmanifest`: nombre, iconos (maskable incluidos), `display:
standalone`, `theme_color`, orientación, atajos (shortcuts) a Check-in y Nuevo
  cliente.
- Instalable y verificada en: **Android** (Chrome), **Windows/Mac/Linux**
  (Chrome/Edge instalable), **tablets**. iOS Safari: soporte con las
  limitaciones conocidas (sin push web fiable hasta versiones recientes; se
  documenta como known-limitation).
- Prompt de instalación **contextual** (tras primer uso exitoso), no intrusivo.

## 6. Conflictos y consistencia

- **Check-in / asistencia:** append-only, sin conflictos por diseño (cada evento
  es un documento nuevo, id determinista).
- **Datos mutables (member, membership):** last-write-wins de Firestore es
  aceptable porque la fuente de verdad de vigencia se recalcula en servidor tras
  cada write. La UI muestra "sincronizando…" mientras hay mutaciones pendientes.
- **Indicador de conectividad** siempre visible en el shell (online / offline /
  sincronizando) para que el recepcionista sepa el estado real.
