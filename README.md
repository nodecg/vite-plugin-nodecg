# [vite-plugin-nodecg](https://www.npmjs.com/package/vite-plugin-nodecg)

### Vite plugin to enable its use with NodeCG

Generates .html files for your graphics and dashboards so they use the Vite dev-server in development, and load assets directly in production.

## Setup

1. Install the plugin in your bundle: `npm i -D vite-plugin-nodecg`
2. Create 2 template.html files, `./src/graphics/template.html` and `./src/dashboard/template.html`
3. Install the plugin in your vite config (see example below)
4. (Optional) Configure `vite-plugin-nodecg` to match your bundle's structure (again see below)
5. Run `vite` for development or `vite build` for production

## Default behaviour

By default `vite-plugin-nodecg` will load all .js and .ts files in `./src/graphics` and `./src/dashboard` (not nested), using the templates `./src/graphics/template.html` and `./src/dashboard/template.html` respectively.

```javascript
import { defineConfig } from 'vite'
import NodeCGPlugin from 'vite-plugin-nodecg'

export default defineConfig({
    plugins: [NodeCGPlugin()],
})
```

## Custom config

If you want a specific graphic/panel to have its own template, use a different path for the templates, or have the entry points in a different structure, you can specify this with the `inputs` field in the plugin options. The keys of which are the glob expressions to find inputs, and the values are the corresponding templates to use.

### Supported input patterns
`vite-plugin-nodecg` uses the globby library to find and match inputs, the supported patterns of which can be found [here](https://www.npmjs.com/package/globby#globbing-patterns).

### Input ordering
When determining which input to use, `vite-plugin-nodecg` will iterate top to bottom in the `inputs` section of the config and use the first one it comes across. Hence why in the example below `special_graphic` has to come before `./src/graphics/*/main.js`, otherwise that would match first.

### Example
The following config is for a bundle with a separate `templates` directory, which has a `special_graphic` with a `special_template`, and which nests each input in its own sub-directory (e.g. `./src/graphics/timer/main.js`).

```javascript
import { defineConfig } from 'vite'
import NodeCGPlugin from 'vite-plugin-nodecg'

export default defineConfig(() => {
    return {
        plugins: [
            NodeCGPlugin({
                inputs: {
                    './src/graphics/special_graphic/main.js': './templates/special_template.html',
                    './src/graphics/*/main.js': './templates/graphics.html',
                    './src/dashboard/*/main.js': './templates/dashboard.html',
                },
            }),
        ],
    }
})
```

### Default plugin options
```javascript
{
    inputs: {
        './src/graphics/*.{js,ts}': './src/graphics/template.html',
        './src/dashboard/*.{js,ts}': './src/dashboard/template.html',
    }
}
```

## Why?

Webpack is slow. Vite is reallly fast, but its dev server can't emit files to disk (kinda by design).

`vite build --watch` emits the build to disk on source update but doesn't give you HMR. Using this plugin you get the full Vite experience.

## Testing

### To manually test:

-   ensure the latest version of the plugin has been built locally and exists in `/dist`
-   clear out the `dashboard`, `graphics` and `shared` directories from the `test/test-bundle`
-   run `pnpm build` in `test-bundle` and examine the built files
-   the new files should be identical to the committed ones
-   for development, run `pnpm dev` and for now a manual review of the built files is required

## Todo

-   ~~Write tests~~ Automate the diff-test and consider unit tests
-   ~~Investigate other template setup possibilties~~ (see [#2](https://github.com/Dan-Shields/vite-plugin-nodecg/issues/2))
