# 04 · Modelo de datos Firestore + Escalabilidad

> Entregables 6 y 17. Estructura concreta pensada para 100 gimnasios,
> 10 000 clientes y 1 000 000 de asistencias.

## 1. Decisión de aislamiento multi-tenant

**Opción elegida: subcolecciones bajo la organización.**

```
/organizations/{orgId}
/organizations/{orgId}/members/{memberId}
/organizations/{orgId}/plans/{planId}
/organizations/{orgId}/memberships/{membershipId}
/organizations/{orgId}/payments/{paymentId}
/organizations/{orgId}/checkins/{checkinId}
/organizations/{orgId}/cashSessions/{sessionId}
/organizations/{orgId}/cashSessions/{sessionId}/movements/{movementId}
/organizations/{orgId}/products/{productId}
/organizations/{orgId}/routines/{routineId}
/organizations/{orgId}/staff/{uid}
/organizations/{orgId}/counters/{counterId}   // rollups precomputados
/users/{uid}                                    // índice global uid → orgId(s)
```

**Por qué subcolecciones y no un campo `tenantId` en colecciones planas:**
- La ruta **contiene** el `orgId` → las Rules validan aislamiento con una sola
  comparación (`orgId == token.orgId`), sin depender de un campo que se puede
  falsear.
- Consultas naturalmente acotadas al tenant (nunca escanean otros gimnasios).
- Índices más pequeños y baratos por colección.

> Alternativa descartada: **una colección plana global con `tenantId`**. Es
> válida y algunos SaaS la usan, pero aquí obliga a filtrar por `tenantId` en
> **cada** query y a confiar en que nunca se olvide; un solo query sin el filtro
> = fuga de datos. Con subcolecciones, el aislamiento es estructural, no por
> disciplina. Para el volumen objetivo (miles de gyms, no millones de tenants)
> el "hot-tenant" no es un problema real.

## 2. Esquemas de documento (campos principales)

### `members/{memberId}`
```ts
{
  id: string;
  code: string;              // código corto legible (búsqueda/QR)
  firstName: string;
  lastName: string;
  searchName: string;        // "juan perez" normalizado (lowercase, sin acentos)
  phone: string | null;      // E.164 normalizado
  email: string | null;
  photoUrl: string | null;
  notes: string | null;
  // --- desnormalización justificada (evita N lecturas en la lista/ficha) ---
  status: 'active'|'expired'|'pending'|'frozen'|'cancelled'; // derivado, mantenido por CF
  currentMembershipId: string | null;
  membershipEndDate: Timestamp | null;   // para pintar "próximo vencimiento" sin join
  lastCheckInAt: Timestamp | null;
  createdAt: Timestamp; updatedAt: Timestamp;
}
```
> **Justificación de la desnormalización:** la lista de clientes y el check-in
> necesitan mostrar estado y vencimiento **sin** leer la subcolección de
> membresías por cada fila. `status`, `currentMembershipId`, `membershipEndDate`
> y `lastCheckInAt` son campos derivados **mantenidos por Cloud Functions** ante
> cambios en memberships/payments/checkins. Fuente de verdad = memberships;
> estos campos son caché consistente.

### `plans/{planId}`
```ts
{ id, name, type: 'daily'|'weekly'|'biweekly'|'monthly'|'annual'|'promo',
  priceCents: number, currency: string, durationDays: number,
  isActive: boolean, allowsFreeze: boolean, createdAt, updatedAt }
```

### `memberships/{membershipId}`  — fuente de verdad de vigencia
```ts
{ id, memberId, planId, planNameSnapshot: string, priceCentsSnapshot: number,
  status: 'pending'|'active'|'frozen'|'expired'|'cancelled',
  startDate: Timestamp, endDate: Timestamp,
  frozenDays: number, createdBy: uid, createdAt, updatedAt }
```
> `planNameSnapshot`/`priceCentsSnapshot`: se congela el nombre y precio del plan
> al momento de venta (el plan puede cambiar de precio después; el histórico no debe mutar).

### `payments/{paymentId}`  — inmutable
```ts
{ id, memberId, membershipId: string|null, amountCents: number, currency: string,
  method: 'cash'|'card'|'transfer'|'other',
  cashSessionId: string|null, staffUid: string, notes: string|null,
  receiptNumber: string, createdAt: Timestamp }  // sin updatedAt: inmutable
```

### `checkins/{checkinId}`  — alto volumen (1M+)
```ts
{ id, memberId, memberNameSnapshot: string,
  result: 'allowed'|'expired'|'pending_payment'|'denied',
  membershipStatusAtEntry: string, staffUid: string,
  source: 'qr'|'search'|'code'|'phone', createdAt: Timestamp,
  dateKey: string }   // 'YYYY-MM-DD' para consultas por día e índices baratos
```

### `cashSessions/{sessionId}` + `movements/{movementId}`
```ts
// session
{ id, status: 'open'|'closed', openedBy: uid, openedAt, openingFloatCents,
  closedBy: uid|null, closedAt: Timestamp|null,
  totals: { incomeCents, expenseCents, expectedCents, countedCents, diffCents } }
// movement
{ id, type: 'income'|'expense', amountCents, currency,
  reason: string, paymentId: string|null, staffUid: uid, createdAt }
```

### `counters/{counterId}`  — rollups precomputados (clave para el costo)
```ts
// ej. counters/stats-2026-07  (mensual) y counters/daily-2026-07-31
{ activeMembers: number, expiredMembers: number,
  checkinsToday: number, incomeTodayCents: number,
  incomeMonthCents: number, pendingRenewals: number, updatedAt }
```

## 3. Estrategia contra el costo de Firestore (escalabilidad)

1. **Nunca `count()` ni sumas en caliente para el dashboard.** Cloud Functions
   mantienen `counters/*` de forma incremental (trigger onCreate/onUpdate). El
   dashboard lee **1 documento**, no 10 000.
2. **Particionar por tiempo lo de alto volumen.** Los checkins llevan `dateKey`;
   las consultas y estadísticas se hacen por rango de día, no full-scan.
3. **Paginación por cursor** (`startAfter`) en todas las listas. Nunca traer
   colecciones completas al cliente.
4. **Índices compuestos declarados** en `firestore.indexes.json` (ej.
   `members` por `status + membershipEndDate`; `checkins` por `memberId + createdAt`).
5. **Distributed counters** si un contador supera ~1 escritura/seg sostenida
   (shards). Para el volumen objetivo por gym rara vez hace falta, pero el patrón
   queda previsto.
6. **TTL policies** para datos efímeros (ej. borradores, tokens) y archivado de
   checkins antiguos a almacenamiento frío/BigQuery en Fase 5.

## 4. Índices compuestos previstos (borrador)

| Colección | Campos | Uso |
|---|---|---|
| members | `status ASC, membershipEndDate ASC` | "vencidos", "por vencer" |
| members | `searchName ASC` | búsqueda por nombre |
| checkins | `dateKey DESC, createdAt DESC` | entradas del día |
| checkins | `memberId ASC, createdAt DESC` | historial del cliente |
| payments | `cashSessionId ASC, createdAt ASC` | cuadre de caja |
| memberships | `memberId ASC, endDate DESC` | membresía vigente |

## 5. Límites conocidos y mitigación

- Documento máx. 1 MiB → nunca arrays ilimitados dentro de un doc (checkins y
  pagos son **subcolecciones**, no arrays en el member). ✔
- 1 escritura/seg por documento → contadores agregados usan shards si hace falta. ✔
- Query sin agregación → dashboard por rollups, reportes por BigQuery. ✔
