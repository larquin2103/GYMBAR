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

## 5. Modelo de autenticación (una cuenta por gimnasio)

> **Plan gratuito (Spark), sin Cloud Functions ni Storage.** El modelo sigue el
> de contamypime:
>
> - **Una cuenta de Firebase por gimnasio.** El `uid` de esa cuenta **es** el
>   `organizationId`; todos los datos cuelgan de `/organizations/{uid}`.
> - **Sin custom claims.** Las Reglas solo comprueban `auth.uid == orgId`. Los
>   **roles del personal son datos internos de la app** (login por PIN).
> - **Operaciones en el cliente** (cobros, caja, check-in, ventas) con
>   transacciones de Firestore. `firebase.json` no incluye `functions`.

No hay scripts ni cuentas de servicio: **todo se crea desde la app**. El código
de `functions/` queda en el repo por si algún día activas Blaze.

---

## 6. Crear el gimnasio y el administrador (desde la app)

Tras desplegar (pasos 4 y 7), abre la app y:

1. En la pantalla de acceso, pestaña **“Crear gimnasio”**.
2. Completa: **nombre del gimnasio**, **correo** y **contraseña** (será la cuenta
   de nube, una por gimnasio), tu **nombre** y un **PIN** de 4–6 dígitos.
3. Listo: entras como administrador. Esa cuenta (correo + contraseña) es la que
   usarás para **vincular otros dispositivos** (cada uno inicia sesión con ella y
   luego elige su usuario por PIN).

> **Alta de más usuarios (recepción/entrenadores):** en **Sistema → Usuarios →
> Agregar**, defines nombre, rol y **PIN**. Todos comparten la cuenta de nube del
> gimnasio y se distinguen por su PIN (botón **Cambiar usuario** en el menú de
> cuenta). No hay que tocar la consola de Firebase.

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

- **PWA / offline**: Firestore usa caché persistente (IndexedDB, multipestaña) y
  detección de long-polling (para redes con proxy/VPN que bloquean el streaming);
  la app funciona offline y sincroniza al reconectar.
- **Ícono de nube (sincronización)**: en la barra superior. El verde
  “Sincronizado” solo aparece si hubo una ida y vuelta real con el servidor (no
  solo porque el SO diga “en línea”). Incluye “Sincronizar ahora” para forzar la
  reconexión y refrescar los datos.
- **Multi-tenant**: cada gimnasio es una cuenta de Firebase aislada bajo
  `organizations/{uid}`; el acceso se decide por `auth.uid == orgId`.
- **Multi-dispositivo**: en otro equipo, inicia sesión con el mismo correo y
  contraseña del gimnasio; los datos se sincronizan vía Firestore. Cada persona
  elige su usuario por PIN.
- **Secretos**: nunca subas `app/.env.local` (ya cubierto por `.gitignore`).
