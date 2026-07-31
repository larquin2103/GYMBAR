# 07 · Sistema de diseño y Guía UX/UI

> Entregables 10 y 11.

## 1. Principios visuales

Rapidez · Orden · Profesionalismo · Minimalismo · Confianza. En términos operativos:

- **Espacio antes que densidad decorativa.** Aire generoso, pero tablas de datos
  con densidad ajustable (como Stripe/Linear) para operar rápido.
- **Una acción primaria por pantalla.** Todo lo demás es secundario y va en menús.
- **Color con significado, no decorativo.** El color comunica estado, no adorna.
- **Movimiento discreto.** Transiciones 120–200 ms; nunca animaciones que retrasen.

## 2. Design tokens (fuente única de verdad)

Se implementan como **CSS variables** consumidas por el theme de Tailwind. Esto
permite modo claro/oscuro sin duplicar clases y mantener consistencia.

### Color — semántico, no saturado

```css
:root {
  /* Neutrales (escala fría, base de toda la UI) */
  --color-bg: #ffffff;
  --color-surface: #f8fafc; /* slate-50 */
  --color-border: #e2e8f0; /* slate-200 */
  --color-text: #0f172a; /* slate-900 */
  --color-text-muted: #64748b; /* slate-500 */

  /* Primario consistente (indigo desaturado, confiable, no chillón) */
  --color-primary: #4f46e5; /* indigo-600 */
  --color-primary-hover: #4338ca; /* indigo-700 */
  --color-primary-soft: #eef2ff; /* indigo-50  */

  /* Estados de negocio (mapa canónico) */
  --state-active: #16a34a; /* verde  - activo / pagado */
  --state-expired: #dc2626; /* rojo   - vencido */
  --state-blocked: #b91c1c; /* rojo oscuro - bloqueado */
  --state-pending: #d97706; /* ámbar  - pendiente */
  --state-frozen: #0891b2; /* cyan   - congelado */
  --state-cancel: #64748b; /* gris   - cancelado */
}

:root[data-theme='dark'] {
  --color-bg: #0b0f17;
  --color-surface: #111827;
  --color-border: #1f2937;
  --color-text: #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-primary-soft: #1e1b4b;
  /* Los estados mantienen su tono; se ajusta luminosidad para contraste AA */
}
```

**Mapa canónico de estados** (usado en todo el producto, sin excepción):

| Estado          | Color       | Uso                                 |
| --------------- | ----------- | ----------------------------------- |
| activo / pagado | verde       | membresía vigente, pago confirmado  |
| vencido         | rojo        | membresía expirada                  |
| bloqueado       | rojo oscuro | acceso denegado                     |
| pendiente       | ámbar       | pago pendiente, membresía sin pagar |
| congelado       | cyan        | membresía en freeze                 |
| cancelado       | gris        | baja                                |

### Tipografía

- Familia UI: **Inter** (o system-ui fallback). Números tabulares para dinero/tablas.
- Escala (rem): `12 · 14 · 16 · 18 · 20 · 24 · 30 · 36`.
- Pesos: 400 (cuerpo), 500 (labels), 600 (títulos), 700 (métricas grandes).
- Jerarquía: título de página 24/600, sección 18/600, cuerpo 14/400, meta 12/500 muted.

### Espaciado, radios, sombras

- Espaciado base 4 px: `4 · 8 · 12 · 16 · 24 · 32 · 48`.
- Radios: `sm 6 · md 8 · lg 12 · full`. Botones/inputs `md`; cards `lg`.
- Sombras sutiles (elevación 1-3); en dark se usan bordes en vez de sombras.

### Iconografía

- **Lucide Icons** exclusivamente. Grosor 1.5–2, tamaño 16/20/24. Nunca mezclar
  con otros sets. Icono siempre acompañado de texto salvo en acciones universales.

## 3. Librería de componentes (base del MVP)

Construida a mano sobre Tailwind + primitivas accesibles (Radix UI para
overlays/menús). Nada de kits pesados; control total del look.

`Button` (primary/secondary/ghost/danger) · `Input`/`Field` (con label, error,
hint) · `Select`/`Combobox` · `Sheet` (panel lateral, patrón principal de
edición) · `Dialog` (solo confirmaciones que importan) · `Toast` · `Badge`
(estados) · `Avatar` · `Card` · `Table` (densidad ajustable, sticky header) ·
`Tabs` · `CommandPalette` · `Skeleton` · `EmptyState` · `Stat` (métrica del
dashboard) · `PageHeader`.

## 4. Patrones UX (reglas duras)

- **Sheet > página** para crear/editar: mantiene contexto, menos navegación.
- **Skeletons** en toda carga de lista/ficha; nunca spinners a pantalla completa.
- **Empty states útiles:** siempre explican qué es y ofrecen la acción para
  empezar (ej. "Sin clientes aún · Registrar el primero").
- **Feedback inmediato:** toasts para éxito/error; optimistic UI en acciones
  frecuentes.
- **Confirmaciones solo cuando importan:** eliminar, anular pago, cerrar caja.
  Nunca confirmar acciones reversibles.
- **Formularios inteligentes:** mínimos campos obligatorios, autocompletado,
  valores por defecto sensatos, validación en vivo con Zod.
- **Atajos de teclado:** Cmd/Ctrl-K (paletta), `/` (buscar), `N` (nuevo en
  contexto), `Esc` (cerrar sheet).
- **Accesibilidad:** contraste AA mínimo, foco visible, navegable por teclado,
  labels y roles ARIA en componentes de Radix.

## 5. Responsive (desktop-first, degradación cuidada)

- **Desktop:** sidebar fija + contenido de 1–2 columnas; tablas densas.
- **Tablet:** sidebar colapsable; el Check-in se optimiza para pantalla táctil.
- **Móvil:** navegación inferior; acciones primarias como botón flotante; sheets
  a pantalla completa. Toda pantalla debe verse profesional, no "encogida".
