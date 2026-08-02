# 13 · Despliegue en Firebase (persistencia y multi-dispositivo)

Guía para pasar de **modo demo** (datos en memoria) a **Firebase real** (Auth +
Firestore + Storage + Cloud Functions + Hosting). El código ya soporta ambos
modos: la app decide según las variables `VITE_FIREBASE_*` (ver
`app/src/shared/lib/firebase.ts`, bandera `isFirebaseConfigured`).

---

## 0. Requisitos previos

- **Node 22** (las Functions declaran `engines.node: "22"`).
- **Firebase CLI**: `npm install -g firebase-tools` y `firebase login`.
- **Plan gratuito (Spark) es suficiente** en esta configuración: no se despliegan
  Cloud Functions ni Storage. (Si en el futuro quieres el modo server-authoritative
  con Functions, ahí sí haría falta el plan Blaze — pago por uso con capa gratuita.)

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
   - **Storage** → *opcional*. Solo se usa para la foto del cliente. Si no lo
     habilitas, la app funciona igual (los clientes se crean sin foto). El
     despliegue no incluye Storage.

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
firebase deploy --only firestore:rules,firestore:indexes
```

- `firestore.rules` — aislamiento multi-tenant y operaciones server-only.
- `firestore.indexes.json` — índices compuestos (miembros, check-ins, pagos,
  membresías, rutinas).

> Storage no se despliega (no está en `firebase.json`). Es opcional; solo se usa
> para la foto del cliente y la app funciona sin él.

---

## 5. Operaciones sin Cloud Functions (modo plan gratuito)

> **Este proyecto está configurado para el plan gratuito (Spark).** Las Cloud
> Functions (Gen 2) requieren el plan Blaze, así que **no se despliegan**. En su
> lugar, las operaciones sensibles (cobros, caja, check-in, ventas) se ejecutan
> en el cliente con **transacciones de Firestore**, y las Reglas de Seguridad
> controlan quién puede escribir. `firebase.json` ya no incluye `functions`.

Compromiso consciente: sin servidor, la integridad se apoya en las reglas y en
la confianza del personal (un solo gimnasio). Si más adelante activas Blaze,
el código de `functions/` sigue en el repo para volver al modo server-authoritative.

**No hay nada que desplegar en este paso.** Continúa con el bootstrap.

---

## 6. Crear el primer administrador (bootstrap)

Asignar roles (custom claims) necesita el Admin SDK, que **sí funciona en el plan
gratuito** ejecutándolo tú localmente. Usa el script del repo:

1. Consola → **Configuración del proyecto → Cuentas de servicio → Generar nueva
   clave privada**. Guarda el JSON (p. ej. `sa.json`, **no lo subas a git**).
2. Ejecuta:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./sa.json
node scripts/bootstrap-org.mjs "admin@tugimnasio.com" "UnaClaveFuerte123" "Mi Gimnasio"
```

Salida esperada: *"Organización … creada: <orgId>"* y el usuario ya es admin.
**Anota el `<orgId>`** (lo necesitas para dar de alta más personal). Inicia
sesión en la app con ese correo y contraseña.

> **Alta de más usuarios (recepción/entrenadores):** desde la app, en
> **Sistema → Usuarios → Agregar**, el admin lo registra en el directorio. Para
> darle **acceso real** (cuenta + contraseña + rol), ejecuta el script local:
>
> ```bash
> export GOOGLE_APPLICATION_CREDENTIALS=./sa.json
> node scripts/set-staff-role.mjs <orgId> "recepcion@tugimnasio.com" "ClaveTemporal123" reception "Nombre"
> ```
>
> `role ∈ admin | reception | trainer`. La persona luego inicia sesión con ese
> correo y contraseña. (Con Blaze, esto se haría desde la app sin script.)

---

## 7. Construir y desplegar el Hosting (la app)

```bash
npm run build                     # compila shared + app → app/dist
firebase deploy --only hosting
```

La app queda en `https://TU_PROJECT_ID.web.app`. `firebase.json` ya trae el
rewrite SPA (`** → /index.html`) y el cacheado de assets.

### Todo junto (modo gratuito)

```bash
npm run build        # compila shared + app
firebase deploy      # firestore rules + indexes + hosting (sin functions ni storage)
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
