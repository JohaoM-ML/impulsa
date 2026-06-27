# Paleta de color — Impulsa

Derivada del logo de marca (tienda + flecha de crecimiento sobre verde bosque).
Fuente de verdad: variables HSL en `app/globals.css` y tokens Tailwind en `tailwind.config.ts`.

## Colores de marca

| Token | Hex | HSL (var) | Uso |
| --- | --- | --- | --- |
| `brand.dark` | `#0A3B2A` | `160 71% 14%` | Fondo del logo, TopBar/marca, superficies oscuras, `theme_color` PWA |
| `brand` | `#1FA86A` | `153 69% 39%` | Acción primaria (botones, badges de nivel) |
| `brand.light` | `#2FBE7E` | `153 60% 47%` | Flecha del logo, acentos decorativos, gráficos |
| `brand.tint` | `#EBF7F1` | `150 52% 95%` | Fondos suaves, chips, estados hover |

## Roles semánticos (shadcn / CSS vars)

| Rol | Hex aprox | HSL (var) | Nota |
| --- | --- | --- | --- |
| `background` | `#FFFFFF` | `0 0% 100%` | Contenido mobile sobre blanco |
| `foreground` | `#0F2E22` | `162 47% 11%` | Texto principal (verde casi negro) |
| `primary` | `#1B9A62` | `153 69% 36%` | CTA; texto blanco encima (contraste AA) |
| `primary-foreground` | `#FFFFFF` | `0 0% 100%` | Texto sobre primary |
| `secondary` | `#F1F8F4` | `150 38% 96%` | Superficies secundarias |
| `accent` | `#E6F4EC` | `150 52% 94%` | Resaltes suaves |
| `muted-foreground` | `#5E726A` | `155 12% 42%` | Texto secundario / metadatos |
| `border` / `input` | `#DCE9E3` | `152 22% 90%` | Bordes y divisores |
| `destructive` | `#DC2626` | `0 72% 51%` | Errores y acciones destructivas |
| `ring` | `#1B9A62` | `153 69% 36%` | Foco de teclado |

## Reglas de uso

- Usa `bg-brand` / `text-brand-dark` para elementos de marca; `bg-primary` para acciones.
- El verde brillante (`brand.light`) es decorativo: no lo uses como fondo de texto blanco pequeño (contraste insuficiente). Para CTAs usa `primary`.
- Mantén `brand.dark` para barras/headers branded y el `theme_color` de la PWA.
- Mobile-first 390px: respeta áreas táctiles mínimas (48px) independientemente del color.
