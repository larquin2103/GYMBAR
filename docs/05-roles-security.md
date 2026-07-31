# 05 · Roles, permisos y seguridad

> Entregables 7 y 16. "Nunca confiar en el frontend."

## 1. Modelo de identidad

- Autenticación: Firebase Auth (email/password + opción de link mágico futuro).
- Autorización: **Custom Claims** en el token del usuario:
  ```json
  { "orgId": "org_abc", "role": "admin" }
  ```
- El claim lo asigna **solo** una Cloud Function (`setUserRole`), nunca el cliente.
- `/users/{uid}` mapea uid → organización(es) y rol, para gestión y recuperación.

> Un usuario pertenece a **una** organización en el MVP (claim simple). El soporte
> multi-organización por usuario (cadenas) se añade en Fase 5 con claim de lista
> y selector de contexto, sin romper el modelo.

## 2. Matriz de permisos

| Recurso / Acción | Admin | Recepcionista | Entrenador | Cliente (futuro) |
|---|:---:|:---:|:---:|:---:|
| Ver dashboard | ✔ | ✔ (operativo) | parcial | — |
| Clientes: ver | ✔ | ✔ | ✔ (asignados) | propio |
| Clientes: crear/editar | ✔ | ✔ | — | — |
| Clientes: eliminar | ✔ | — | — | — |
| Membresías: gestionar | ✔ | ✔ | — | ver propia |
| Pagos: registrar | ✔ | ✔ | — | ver propios |
| Pagos: anular/ajustar | ✔ | — | — | — |
| Caja: abrir/cerrar | ✔ | ✔ | — | — |
| Caja: ver histórico | ✔ | turno propio | — | — |
| Check-in | ✔ | ✔ | ✔ | auto (futuro) |
| Rutinas | ✔ | — | ✔ | ver propia |
| Medidas | ✔ | ✔ | ✔ | ver propias |
| Inventario/Productos | ✔ | vender | — | — |
| Reportes | ✔ | operativos | — | — |
| Usuarios/Config | ✔ | — | — | — |

Regla: **el rol se evalúa en el servidor** (Rules + claim). La UI solo **oculta**
lo que el rol no puede hacer (comodidad), pero la seguridad real está en Rules.

## 3. Defensa en profundidad (capas)

```
Capa 1 · UI            → oculta acciones no permitidas (UX, NO seguridad)
Capa 2 · Zod           → valida forma/entrada antes de enviar
Capa 3 · Firestore Rules → aislamiento de tenant + rol + forma del documento
Capa 4 · Cloud Functions → invariantes de negocio y operaciones sensibles
Capa 5 · App Check      → bloquea clientes no legítimos (anti-abuso)
```

## 4. Firestore Rules — patrón base

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function isSignedIn() { return request.auth != null; }
    function orgId()      { return request.auth.token.orgId; }
    function role()       { return request.auth.token.role; }
    function inOrg(oid)   { return isSignedIn() && orgId() == oid; }
    function isAdmin()    { return role() == 'admin'; }
    function isReception(){ return role() == 'reception' || isAdmin(); }

    match /organizations/{oid} {
      allow read: if inOrg(oid);
      allow write: if inOrg(oid) && isAdmin();

      match /members/{id} {
        allow read:  if inOrg(oid);
        allow create, update: if inOrg(oid) && isReception()
                              && incomingMemberIsValid();
        allow delete: if inOrg(oid) && isAdmin();
      }

      // Pagos: inmutables desde el cliente. Solo crea; nunca update/delete.
      match /payments/{id} {
        allow read:   if inOrg(oid) && isReception();
        allow create: if inOrg(oid) && isReception() && paymentIsValid();
        allow update, delete: if false;   // anulaciones vía Cloud Function
      }

      // Cierre de caja: solo vía Cloud Function (no confiar totales al cliente).
      match /cashSessions/{id} {
        allow read:   if inOrg(oid) && isReception();
        allow create: if inOrg(oid) && isReception();     // apertura
        allow update: if false;                            // cierre = CF
      }
    }
  }
}
```
> `incomingMemberIsValid()` / `paymentIsValid()` validan tipos, enums y que
> `organizationId`/montos no puedan falsearse. Estas funciones se testean en CI.

## 5. Operaciones que SOLO viven en Cloud Functions

- `setUserRole` — asignar/cambiar roles y claims (jamás desde el cliente).
- `closeCashSession` — calcular totales, cuadrar, cerrar (no confiar en el cliente).
- `voidPayment` — anular pago creando movimiento de ajuste (auditoría).
- `recomputeMemberStatus` — mantener campos derivados del member.
- `updateCounters` — rollups del dashboard.
- `onOrganizationCreated` — bootstrap del tenant + primer admin.

## 6. Storage Rules

Fotos de clientes y recibos: acceso restringido por `orgId` en la ruta
(`/{orgId}/members/{memberId}/...`), lectura/escritura solo para staff del mismo
tenant, límite de tamaño y `contentType` (imágenes/PDF) validado en la regla.

## 7. Otros controles

- **App Check** (reCAPTCHA/DeviceCheck) en Firestore, Storage y Functions.
- **Secrets** en Secret Manager, nunca en el repo ni en el bundle.
- **Rate limiting** en callables sensibles.
- **Auditoría:** toda operación sensible (pagos, cierres, cambios de rol) deja
  registro inmutable con `staffUid` y timestamp de servidor.
- **PII mínima:** solo se guarda lo necesario; fotos con URL firmada, no pública.
