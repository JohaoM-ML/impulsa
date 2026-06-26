# SKILL: Crear un nuevo módulo en Impulsa

## Cuándo usar
Cuando pidan un módulo completo: "crea el módulo de gastos", etc.

## Workflow
### Paso 1 — Confirmar
- ¿Qué datos muestra? (listar, detalle, crear, editar, eliminar)
- ¿Requiere IA o solo CRUD?
- ¿Cambia según nivel?

### Paso 2 — API Route
app/api/[modulo]/route.ts con GET, POST, PATCH/DELETE si aplica.
Usar plantilla de api-routes.mdc.

### Paso 3 — Hook de datos
hooks/use[Modulo].ts con loading/error/data.

### Paso 4 — Página lista (3 estados)
app/(dashboard)/[modulo]/page.tsx: cargando, error, vacío, con datos.

### Paso 5 — Página de creación
app/(dashboard)/[modulo]/nuevo/page.tsx: form + loading + toast + redirect.

### Paso 6 — Nav inferior
Agregar link en NavInferior.tsx solo si es módulo principal.

### Paso 7 — Verificación
- [ ] API filtra por negocio_id
- [ ] 3 estados en página lista
- [ ] Form con loading state
- [ ] vocab() donde corresponde
- [ ] Link en nav (si aplica)
