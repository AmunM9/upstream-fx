# Cómo se comparte Upstream

Los componentes animados se distribuyen por varios canales a la vez. Este repo
funciona **solo con GitHub**, sin npm ni Vercel:

| Canal | Quién lo usa | Cómo se instala | De dónde sale |
|---|---|---|---|
| **GitHub (npm)** | Devs con React, Next, Vite… | `npm install github:AmunM9/upstream-fx` | npm descarga el repo y ejecuta `prepare` (compila `dist/`) |
| **CDN (`<script>`)** | Webflow, WordPress, HTML plano | `<script src="https://cdn.jsdelivr.net/gh/AmunM9/upstream-fx@v0.1.0/dist/upstream.global.js">` | jsDelivr sirve el archivo del tag `v0.1.0` |
| **Registry shadcn** | Devs que quieren el código fuente | `npx shadcn@latest add https://raw.githubusercontent.com/AmunM9/upstream-fx/v0.1.0/public/r/upstream.json` | El JSON del registry está versionado en el repo |
| **Playground** | Cualquiera que quiera verlo | Página web | Vercel (ver abajo) |

`dist/upstream.global.js` y `public/r/upstream.json` **se suben al repo a propósito**:
son lo que sirven jsDelivr y shadcn. El resto de `dist/` se genera al instalar.

## Publicar una versión nueva

```bash
npm version patch --no-git-tag-version   # o minor / major; solo cambia package.json
npm run build && npm run build:registry  # regenera dist/upstream.global.js y public/r/upstream.json
git add -A && git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z                           # el tag se crea DESPUÉS del build, para que apunte a los archivos nuevos
git push && git push --tags
```

Los snippets del playground leen la versión de `package.json`. En el README hay que
cambiar `v0.1.0` a mano.

## Desplegar el playground en Vercel (login solo para este proyecto)

El CLI de Vercel guarda la sesión de forma global. Con `--global-config` la sesión
queda dentro de `.vercel-cli/` en esta carpeta (ignorada por git), así que no toca
otras cuentas de tu equipo:

```bash
npm run vercel:login    # = npx vercel login --global-config .vercel-cli
npm run deploy          # = npx vercel deploy --prod --global-config .vercel-cli
```

La primera vez, `deploy` pregunta a qué equipo y proyecto enlazarlo. `vercel.json`
ya define el build (`npm run build:demo`) y la carpeta de salida (`site`).

## Publicar en npm (opcional, más adelante)

Así la instalación quedaría en `npm install upstream-fx` (más rápida, sin compilar):

```bash
npm login          # lo haces tú, con tu cuenta de npm
npm publish
```

Después cambia los comandos `github:AmunM9/upstream-fx` por `upstream-fx` en el
README y en `demo/snippets.ts`.

## Difusión

- Comparte el GIF del README y el link al playground en X, LinkedIn, Reddit (r/webdev, r/reactjs) y Dribbble.
- Envíalo a directorios de componentes que aceptan contribuciones por PR.
- Opcional: un *code component* para Framer a partir de `src/react/Upstream.tsx` con `addPropertyControls`.

## Licencia y originalidad

MIT. El efecto está *inspirado* en "Connectivity Graph" de OriginKit (de pago);
la implementación es propia y el README reconoce la inspiración. Por eso usa
otro nombre.
