# 09 · Arquitectura del backend

> Entregable 13. Firebase como backend; Cloud Functions para lo que no se confía al cliente.

## 1. Qué corre dónde

| Responsabilidad | Dónde | Por qué |
|---|---|---|
| Lecturas/escrituras CRUD simples | Cliente + Firestore Rules | Rápido, offline, menos backend |
| Aislamiento de tenant y rol | Firestore Rules (claims) | Estructural, infranqueable |
| Cobros, cierre de caja, anulaciones | Cloud Functions (callable) | Integridad transaccional, no confiable al cliente |
| Claims/roles | Cloud Functions (admin SDK) | El cliente jamás asigna permisos |
| Rollups/contadores del dashboard | Cloud Functions (triggers) | Costo y consistencia |
| Notificaciones | Cloud Functions (scheduled) + FCM | Vencimientos, recordatorios |
| Recibos PDF | Cloud Functions + Storage | Generación server-side confiable |

## 2. Organización de Cloud Functions (por dominio)

```
functions/src/
  index.ts                 # exporta agrupado
  membership/
    onMembershipWrite.ts    # recomputa member.status/endDate
  payments/
    createPayment.ts        # callable: valida, crea pago + movimiento caja (tx)
    voidPayment.ts          # callable: anula con movimiento de ajuste
  cashbox/
    closeCashSession.ts     # callable: calcula totales, cuadra, cierra (tx)
  members/
    onCheckinCreate.ts      # actualiza lastCheckInAt + contador diario
  admin/
    setUserRole.ts          # callable admin-only: claims
    onOrganizationCreated.ts# bootstrap tenant + primer admin
  stats/
    updateCounters.ts       # triggers → counters/*
  notifications/
    scheduleExpiryReminders.ts # scheduled: FCM a vencimientos próximos
  shared/
    auth.ts                 # guards: assertRole, assertSameOrg
    money.ts, tx.ts, validators (Zod)
```

## 3. Patrones clave

**Transacciones para dinero.** `createPayment` y `closeCashSession` usan
transacciones/batched writes: el pago, el movimiento de caja y la actualización
de la membresía se aplican **atómicamente** o no se aplican. Nada de estados
intermedios inconsistentes.

**Idempotencia.** Las callables sensibles aceptan un `clientRequestId`; si se
reintenta (red inestable), no se duplica el cobro. Crítico con offline/reintentos.

**Validación server-side con el mismo contrato Zod** que el frontend (schemas
compartidos en un paquete común), para no divergir.

**Guards de autorización** en cada callable: `assertSameOrg(context, orgId)` +
`assertRole(context, ['admin'])`. Nunca se deduce el `orgId` del payload sin
verificar contra el claim.

## 4. Recibos y documentos

`generateReceipt` (Function) renderiza el recibo a PDF y lo guarda en Storage
bajo `/{orgId}/receipts/...`, devolviendo URL firmada de corta duración. Los
reportes exportables (doc 11 futuro) siguen el mismo patrón server-side.

## 5. Programadas (scheduled)

- `scheduleExpiryReminders` (diario): busca membresías que vencen en N días,
  envía FCM y marca "renovación pendiente" para el dashboard.
- `dailyRollup` (diario, madrugada): consolida contadores del día y archiva.

## 6. Observabilidad

- Cloud Logging estructurado en todas las Functions (con `orgId`, sin PII).
- Alertas en errores de callables de dinero.
- Métricas de latencia p95 de check-in y de cierre de caja.
