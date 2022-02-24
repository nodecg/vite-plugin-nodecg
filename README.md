# vite-plugin-nodecg

### Vite plugin to enable its use with NodeCG

Generates .html files for your graphics and dashboards so they use the Vite dev-server in development, and load assets directly in production. Allows 1 .html template for graphics and another for dashboard panels.

## Setup
1. Install the plugin in your bundle: `npm i -D vite-plugin-nodecg`
2. Create 2 template.html files, `./src/graphics/template.html` and `./src/dashboard/template.html`
3. Install the plugin in your vite config (see example below)
4. Specify your graphic and dashboard entry files in your vite config (.ts or .js acceptable)
5. Run `vite` for development or `vite build` for production

## Basic vite.config.mjs example

```javascript
import { defineConfig } from 'vite'
import NodeCGPlugin from 'vite-plugin-nodecg'

export default defineConfig({
    plugins: [NodeCGPlugin()],
    build: {
        rollupOptions: {
            input: [
               './src/graphics/example.ts',
                './src/dashboard/example.ts',
            ],
        },
    }
})
```

## vite.config.mjs example using [globby](https://www.npmjs.com/package/globby)

```javascript
import { defineConfig } from 'vite'
import NodeCGPlugin from 'vite-plugin-nodecg'
import { globbySync } from 'globby'

export default defineConfig(() => {
    const input = globbySync([
        './src/dashboard/*.js',
        './src/graphics/*.js',

        './src/dashboard/*.ts',
        './src/graphics/*.ts',
    ])

    return {
        plugins: [NodeCGPlugin()],
        build: {
            rollupOptions: {
                input,
            },
        }
    }
})
```

## Why?
Webpack is slow. Vite is reallly fast, but its dev server can't emit files to disk (kinda by design).

`vite build --watch` emits the build to disk on source update but doesn't give you HMR. Using this plugin you get the full Vite experience.

## Todo
- Write tests
- Investigate other template setup possibilties
