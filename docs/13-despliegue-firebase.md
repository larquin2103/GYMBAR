# 13 · Despliegue en Firebase (persistencia y multi-dispositivo)

Guía para pasar de **modo demo** (datos en memoria) a **Firebase real** (Auth +
Firestore + Storage + Cloud Functions + Hosting). El código ya soporta ambos
modos: la app decide según las variables `VITE_FIREBASE_*` (ver
`app/src/shared/lib/firebase.ts`, bandera `isFirebaseConfigured`).

---

## 0. Requisitos previos

- **Node 22** (las Functions declaran `engines.node: "22"`).
- **Firebase CLI**: `npm install -g firebase-tools` y `firebase login`.
- Una **tarjeta** asociada: desplegar Cloud Functions (Gen 2) requiere el plan
  **Blaze** (pago por uso; tiene capa gratuita generosa).

---

## 1. Crear el proyecto de Firebase

1. Ve a <https://console.firebase.google.com> → **Agregar proyecto**.
2. Pon un nombre; anota el **Project ID** (p. ej. `gymbar-prod-1234`). Es único
   y global.
3. En **Compilación** activa:
   - **Authentication** → pestaña *Sign-in method* → habilita **Correo
     electrónico/contraseña**.
   - **Firestore Database** → *Crear base de datos* → modo **producción** →
     elige región (p. ej. `nam5` o la más cercana). Las reglas ya vienen en el
     repo, no uses las de prueba.
   - **Storage** → *Comenzar* (para fotos de clientes).

Actualiza los alias de proyecto en **`.firebaserc`** con tu Project ID real, o
usa alias de la CLI:

```bash
firebase use --add        # elige tu proyecto y ponle alias, p. ej. "prod"
```

---

## 2. Registrar la app web y obtener las credenciales

1. Consola → **Configuración del proyecto** (engranaje) → *Tus apps* → ícono
   **`</>`** (Web) → registra la app (sin Hosting por ahora).
2. Copia el objeto `firebaseConfig`.
3. Crea **`app/.env.local`** a partir de `.env.example` y rellena:

```dotenv
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=TU_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=TU_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=TU_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef

VITE_USE_FIREBASE_EMULATORS=false
```

> Con `VITE_FIREBASE_API_KEY` y `VITE_FIREBASE_PROJECT_ID` presentes, la app
> deja el modo demo y usa Firestore/Auth automáticamente.

---

## 3. (Opcional pero recomendado) Probar con emuladores primero

```bash
# En app/.env.local: VITE_USE_FIREBASE_EMULATORS=true
firebase emulators:start          # Auth 9099 · Firestore 8080 · Functions 5001 · Storage 9199
npm run dev                        # en otra terminal
```

Verifica login, cobros, check-in y ventas contra los emuladores. Luego vuelve a
`VITE_USE_FIREBASE_EMULATORS=false` para producción.

---

## 4. Desplegar reglas e índices

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

- `firestore.rules` — aislamiento multi-tenant y operaciones server-only.
- `firestore.indexes.json` — índices compuestos (miembros, check-ins, pagos,
  membresías, rutinas).
- `storage.rules` — acceso a fotos por organización.

---

## 5. Desplegar las Cloud Functions

Las Functions dependen del paquete `@gymbar/shared`; el `predeploy` compila
`functions` automáticamente, pero conviene construir `shared` antes:

```bash
npm run build --workspace @gymbar/shared
firebase deploy --only functions
```

Funciones desplegadas: `createOrganization`, `inviteStaff`, `setUserRole`,
`removeStaff`, `renewMembership`, `registerCheckIn`, `openCashSession`,
`addCashMovement`, `closeCashSession`, `registerSale`, `healthcheck`.

---

## 6. Crear el primer administrador (bootstrap)

Un admin no se puede crear desde la app sin otro admin previo. Usa el script del
repo, que crea el usuario, la organización y le asigna los claims de admin:

1. Consola → **Configuración del proyecto → Cuentas de servicio → Generar nueva
   clave privada**. Guarda el JSON (p. ej. `sa.json`, **no lo subas a git**).
2. Ejecuta:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./sa.json
node scripts/bootstrap-org.mjs "admin@tugimnasio.com" "UnaClaveFuerte123" "Mi Gimnasio"
```

Salida esperada: *"Organización … creada"* y el usuario ya es admin. A partir de
ahí, inicia sesión en la app con ese correo y contraseña.

> Alta de más usuarios (recepción/entrenadores): ya integrada de punta a punta.
> Desde la app, en **Sistema → Usuarios → Agregar**, el admin crea la cuenta
> (Cloud Function `inviteStaff`): se crea el acceso, se asignan los claims
> (orgId + rol) y se muestra un **enlace para que el usuario defina su
> contraseña**. Cambiar rol usa `setUserRole` y quitar personal usa
> `removeStaff` (revoca los claims). No requiere pasos manuales en la consola.

---

## 7. Construir y desplegar el Hosting (la app)

```bash
npm run build                     # compila shared + app → app/dist
firebase deploy --only hosting
```

La app queda en `https://TU_PROJECT_ID.web.app`. `firebase.json` ya trae el
rewrite SPA (`** → /index.html`) y el cacheado de assets.

### Todo junto

```bash
npm run build --workspace @gymbar/shared
npm run build
firebase deploy      # rules + indexes + storage + functions + hosting
```

---

## 8. Verificación post-despliegue

- [ ] `https://TU_PROJECT_ID.web.app` carga el login (no el shell demo).
- [ ] Login con el admin del paso 6.
- [ ] Crear un cliente → aparece en Firestore (`organizations/{orgId}/members`).
- [ ] Cobrar una membresía → se crean `payments` + `memberships` y, con caja
      abierta, el movimiento de ingreso (lo hace `renewMembership`).
- [ ] Check-in y una venta de productos (descuenta stock vía `registerSale`).
- [ ] Abrir en otro dispositivo/navegador con el mismo usuario: los datos
      persisten y se sincronizan.

---

## 9. Notas de producción

- **PWA / offline**: Firestore usa caché persistente (IndexedDB, multipestaña);
  el check-in funciona offline y sincroniza al reconectar.
- **Multi-tenant**: cada gimnasio es una organización aislada bajo
  `organizations/{orgId}`; los claims deciden el acceso, nunca el cliente.
- **Entornos**: `.firebaserc` define `default`/`staging`/`prod`. Cambia con
  `firebase use <alias>` antes de cada `deploy`.
- **Secretos**: nunca subas `app/.env.local` ni el JSON de la cuenta de
  servicio (ya cubiertos por `.gitignore`).
