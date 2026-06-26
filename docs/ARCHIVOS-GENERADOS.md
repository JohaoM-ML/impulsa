# Archivos generados — qué ignorar

Impulsa es un proyecto **TypeScript + Next.js**. El código fuente vive en `.ts` y `.tsx`. Los `.js`, `.js.map` y `.d.mts.map` que ves en el explorador **no son código tuyo** en la mayoría de casos.

## Archivos legítimos en el repo (sí tocar)

| Archivo | Por qué existe |
|---------|----------------|
| `next.config.js` | Config de Next.js (formato JS por compatibilidad) |
| `postcss.config.js` | Config de PostCSS / Tailwind |
| `public/sw.js` | Service Worker de la PWA |

Todo lo demás del producto está en `.ts` / `.tsx`.

## Carpetas generadas automáticamente (no mover, no commitear)

| Carpeta | Contenido | Acción |
|---------|-----------|--------|
| `node_modules/` | Dependencias npm (~5000+ `.map`) | `npm install` la recrea. **No reorganizar.** |
| `.next/` | Build de desarrollo/producción | `npm run dev` / `npm run build` la recrea. Se puede borrar con seguridad. |

## Tipos de archivo que verás y por qué

| Extensión | Qué es |
|-----------|--------|
| `.js.map` | Source map: enlaza JS minificado con el TS original (debug) |
| `.d.mts.map` | Source map de tipos TypeScript en paquetes ESM |
| `.mjs` / `.cjs` | JavaScript empaquetado de librerías npm |

**No hace falta “ordenarlos” en carpetas.** Cada paquete npm los genera dentro de su propia carpeta en `node_modules/`. Moverlos rompe las dependencias.

## Limpiar caché de build

Si `.next/` ocupa mucho o quieres un build limpio:

```bash
# PowerShell
Remove-Item -Recurse -Force .next
npm run dev
```

## IDE (Cursor / VS Code)

En `.vscode/settings.json` están configurados `files.exclude` y `search.exclude` para ocultar `node_modules`, `.next` y todos los `*.map` del explorador.

## Git

El `.gitignore` del proyecto ya excluye `node_modules/`, `.next/` y `*.map`. No deben subirse al repositorio.

> **Nota:** Si tu git está inicializado en una carpeta padre (p. ej. tu usuario de Windows), el explorador puede mostrar archivos de otros proyectos. Lo ideal es que el repositorio git viva solo dentro de `HACKATON ESAN/`.
