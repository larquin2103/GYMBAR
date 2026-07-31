# 08 · Arquitectura del frontend

> Entregable 12. SOLID · Clean Architecture · Feature-based · Repository Pattern.

## 1. Regla de oro

> **La lógica de negocio NO vive en componentes React.** Los componentes solo
> orquestan UI y disparan casos de uso. El acceso a datos pasa siempre por un
> repositorio; ningún componente importa `firebase/firestore` directamente.

## 2. Estructura de carpetas (feature-based + capas)

```
src/
  app/                      # composición: router, providers, layout, theme
    router.tsx
    providers.tsx           # QueryClient, Auth, Theme, App Check
    layout/                 # Shell, Sidebar, CommandPalette
  shared/                   # transversal, sin dependencias de features
    ui/                     # design system (Button, Sheet, Table, ...)
    lib/                    # firebase init, query keys, utils, money, dates
    hooks/                  # useDebounce, useMediaQuery, useHotkeys
    types/                  # tipos compartidos
  domain/                   # NÚCLEO: entidades + contratos (sin Firebase)
    member/
      member.entity.ts      # tipos + invariantes puras
      member.schema.ts      # Zod
      member.repository.ts  # INTERFACE (contrato)
    membership/ payment/ cashbox/ checkin/ ...
  data/                     # implementación de repositorios (Firestore)
    member/member.firestore.repository.ts
    mappers/                # doc Firestore <-> entidad de dominio
  features/                 # casos de uso + UI por módulo
    members/
      api/                  # hooks TanStack Query que usan el repositorio
        useMembers.ts
        useCreateMember.ts
      components/           # UI específica del feature
      pages/                # MembersPage, MemberDetailPage
      use-cases/            # lógica de aplicación (orquesta repos/reglas)
    checkin/ payments/ cashbox/ dashboard/ ...
  main.tsx
```

## 3. Capas y dependencias (Clean Architecture)

```
UI (components/pages)
   ↓ usa
features/api (hooks TanStack Query)   ← estado de servidor
   ↓ usa
use-cases (lógica de aplicación)
   ↓ depende de
domain (entidades + interfaces de repositorio)   ← NO conoce Firebase
   ↑ implementado por
data (repositorios Firestore)   ← detalle, reemplazable
```

Dependencias apuntan **hacia el dominio**. El dominio no conoce React ni
Firebase → testeable en aislamiento y protegido del vendor lock-in.

## 4. Repository Pattern (ejemplo)

```ts
// domain/member/member.repository.ts  (contrato, sin Firebase)
export interface MemberRepository {
  getById(orgId: string, id: string): Promise<Member | null>;
  search(orgId: string, q: MemberQuery): Promise<Page<Member>>;
  create(orgId: string, input: NewMember): Promise<Member>;
  update(orgId: string, id: string, patch: MemberPatch): Promise<void>;
}

// data/member/member.firestore.repository.ts  (detalle)
export class FirestoreMemberRepository implements MemberRepository {
  /* ... */
}

// features/members/api/useMembers.ts  (estado de servidor)
export function useMembers(query: MemberQuery) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: qk.members.list(orgId, query),
    queryFn: () => memberRepo.search(orgId, query),
  });
}
```

## 5. Gestión de estado

- **Estado de servidor:** TanStack Query (caché, revalidación, paginación por
  cursor, mutaciones optimistas). Es la fuente para todo lo remoto.
- **Estado de UI local:** `useState`/`useReducer` por componente.
- **Estado global mínimo:** Context para sesión/rol/tema. **No** un store global
  para datos de servidor (eso lo maneja Query).
- **Formularios:** React Hook Form + Zod resolver. Validación de dominio en el
  schema, reutilizada por front y (equivalente) en Rules/Functions.

## 6. Rendimiento

- **Code splitting por ruta** (`React.lazy` + Suspense) → cada módulo carga bajo
  demanda; carga inicial mínima.
- **Vite** para build rápido y tree-shaking; chunking manual de vendors pesados.
- **Memoización quirúrgica** (`memo`/`useMemo`/`useCallback`) solo donde el
  perfil lo justifique; no por defecto.
- **Listas virtualizadas** para tablas largas (asistencia, pagos).
- **Optimización de imágenes:** subida redimensionada, `loading="lazy"`,
  formatos modernos, placeholders (blur/skeleton).
- **TanStack Query** evita refetch innecesario; `staleTime` afinado por recurso.
- Presupuesto de rendimiento: JS inicial < 200 KB gzip; Lighthouse perf > 90 desktop.

## 7. Convenciones de código

- TypeScript estricto (`strict: true`, sin `any` salvo justificado).
- Nombres consistentes: `useXxx` (hooks), `XxxRepository`, `XxxPage`, `XxxSheet`.
- Un componente = una responsabilidad. Componentes de UI puros y sin fetch.
- ESLint + Prettier + import ordering; sin lógica de negocio en JSX.
