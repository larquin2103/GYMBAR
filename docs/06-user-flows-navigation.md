# 06 · Flujos de usuario y mapa de navegación

> Entregables 8 y 9.

## 1. Flujo crítico: Check-in (< 10 s)

```mermaid
flowchart TD
    A[Cliente llega] --> B{Modo de búsqueda}
    B -->|QR| C[Escanear QR]
    B -->|Nombre/Tel/Código| D[Cmd-K / campo con foco por defecto]
    C --> E[Resolver member]
    D --> E
    E --> F[Validar membresía localmente<br/>status + endDate ya en caché]
    F --> G{Resultado}
    G -->|Activa| H[✔ Verde: Acceso permitido]
    G -->|Vencida| I[⚠ Ámbar: Vencido — 1 clic renovar]
    G -->|Pago pendiente| J[⚠ Aviso: registrar pago]
    H & I & J --> K[Registrar CheckIn optimista]
    K --> L[Actualizar lastCheckInAt + contadores]
    L --> M[Volver a foco de búsqueda para el siguiente]
```

Claves de diseño:
- El campo de búsqueda tiene **foco por defecto** al abrir la pantalla; el
  recepcionista escribe sin tocar el mouse.
- La validación es **local** (los datos del member ya están en caché offline),
  por eso es instantánea y funciona sin red.
- El registro es **optimista**: se pinta el resultado y se encola la escritura.
- Tras registrar, el foco **vuelve solo** al buscador para el siguiente cliente.

## 2. Flujo: Registrar pago + renovar

```mermaid
flowchart TD
    A[Ficha del cliente] --> B[Acción rápida: Cobrar]
    B --> C[Sheet lateral: plan preseleccionado<br/>monto autocompletado]
    C --> D[Método de pago 1 clic]
    D --> E{¿Renueva membresía?}
    E -->|Sí| F[Extiende endDate según plan]
    E -->|No| G[Solo registra pago]
    F & G --> H[Genera recibo + movimiento de caja]
    H --> I[Toast: Pago registrado · Ver recibo]
```

## 3. Flujo: Apertura y cierre de caja

```mermaid
flowchart LR
    A[Inicio de turno] --> B[Abrir caja + fondo inicial]
    B --> C[Operar: pagos → ingresos<br/>gastos → egresos]
    C --> D[Cerrar caja]
    D --> E[CF calcula esperado vs contado]
    E --> F[Registra diferencia + resumen del turno]
```

## 4. Flujo: Alta de cliente (sin fricción)

Formulario inteligente en **un sheet**, no una página: solo Nombre + Teléfono son
obligatorios; el resto es progresivo. Foto opcional (cámara o archivo). Al
guardar, ofrece asignar plan en el mismo flujo (acción encadenada), evitando
navegar entre pantallas.

## 5. Mapa de navegación

```mermaid
graph LR
    Login --> Shell
    Shell --> Dashboard
    Shell --> Clientes --> FichaCliente
    Shell --> CheckIn
    Shell --> Membresias
    Shell --> Pagos
    Shell --> Caja
    Shell --> Asistencia
    Shell --> Rutinas
    Shell --> Medidas
    Shell --> Inventario --> Productos
    Shell --> Reportes
    Shell --> Usuarios
    Shell --> Configuracion
    Shell -.overlay.-> CommandPalette
    CommandPalette -.-> FichaCliente
    CommandPalette -.-> CheckIn
    CommandPalette -.-> Pagos
```

## 6. Estructura de rutas (React Router)

```
/login
/                         → Dashboard (index)
/check-in                 → pantalla dedicada de mostrador
/members                  → lista + búsqueda
/members/:memberId        → ficha (con tabs internas)
/memberships
/payments
/cashbox                  → caja del turno actual
/attendance
/routines
/measurements
/inventory
/products
/reports
/settings/users
/settings                 → configuración de la organización
```

Navegación: sidebar colapsable (desktop-first), reducido a barra inferior/hamburguesa
en tablet/móvil. **Command palette** transversal (Cmd/Ctrl-K) como acelerador
principal: buscar cliente y disparar acciones desde cualquier pantalla.

## 7. Jerarquía de cada pantalla (las 3 preguntas del brief)

Cada vista responde inmediatamente:
- **¿Qué puedo hacer aquí?** → una barra de título con la acción primaria a la derecha.
- **¿Qué es lo más importante?** → primer bloque = dato/acción de mayor valor
  (ej. buscador en Check-in, indicadores accionables en Dashboard).
- **¿Cuál es la siguiente acción?** → CTA evidente y única; acciones secundarias
  en menú "…".
