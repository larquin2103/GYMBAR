# 11 · Estrategia de pruebas

> Entregable 18. La calidad no se testea al final; se diseña desde el inicio.

## 1. Pirámide de pruebas

```
        e2e (pocas, críticas)         Playwright
      ─────────────────────────
     integración (Rules + repos)      Emulator Suite + Vitest
   ───────────────────────────────
  unitarias (dominio + use-cases)     Vitest  ← la base, muchas y rápidas
```

## 2. Por capa

**Dominio (unitario, mayor cobertura).** Entidades, value objects (Money,
DateRange), máquina de estados de membresía, validación Zod. Sin Firebase, sin
React → rápidas y deterministas.

**Casos de uso (unitario con repos mock).** Se inyecta un `MemberRepository`
falso; se verifica la orquestación (ej. "renovar extiende endDate según el plan y
genera pago + movimiento de caja").

**Firestore Rules (integración — obligatorio).** Con `@firebase/rules-unit-testing`
contra el emulador. Casos mínimos que **deben** pasar en CI:

- Un usuario de `orgA` **no** puede leer/escribir datos de `orgB` (aislamiento).
- Un recepcionista **no** puede anular pagos ni cerrar caja desde el cliente.
- Un pago **no** se puede editar ni borrar desde el cliente.
- Campos con `organizationId`/montos falsificados son rechazados.

**Cloud Functions (integración).** Contra emulador: `createPayment` es
transaccional e idempotente (mismo `clientRequestId` no duplica);
`closeCashSession` cuadra; `setUserRole` solo lo ejecuta un admin.

**Componentes (integración ligera).** Testing Library para formularios (RHF+Zod),
estados de carga (skeleton), empty states, y flujos de sheet.

**E2E (pocas, las críticas del negocio).** Playwright (Chromium ya disponible en
el entorno):

1. Check-in completo en < 10 s (incluido camino offline simulado).
2. Alta de cliente → asignar plan → cobrar → recibo.
3. Apertura y cierre de caja que cuadra.
4. Instalación PWA + arranque offline.

## 3. Calidad continua (CI)

Pipeline en cada PR:

```
lint → typecheck → unit → rules-tests (emulador) → functions-tests → build → e2e (smoke)
```

Merge a `main` bloqueado si algo falla. Deploy a staging automático tras verde.

## 4. Presupuestos y gates

- Cobertura mínima del **dominio y use-cases**: alta (objetivo ≥ 85 %). No se
  persigue cobertura total en UI (bajo valor).
- Lighthouse en CI: PWA installable + performance ≥ 90 (desktop) como gate.
- Sin `any` nuevos sin justificación; sin warnings de lint.

## 5. Datos de prueba

Seeds reproducibles para el emulador (una organización demo con clientes,
planes, pagos y caja) → permite desarrollo y QA sin tocar datos reales y
demostrar el producto en cualquier momento.
