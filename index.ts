import path from 'path'
import fs from 'fs'
import cheerio from 'cheerio'
import type { InputOptions, OutputOptions } from 'rollup'
import type { ResolvedConfig, UserConfig, Manifest } from 'vite'

export default function viteNodeCGPlugin() {
    let config: ResolvedConfig
    let graphicTemplate: Buffer
    let dashboardTemplate: Buffer
    let assetManifest: Manifest
    let inputOptions: InputOptions

    function injectAssets(html: string | Buffer, entry: string) {
        const $ = cheerio.load(html)

        const assets = []

        if (config.mode === 'development') {
            assets.push('<script type="module" src="/@vite/client"></script>')
            assets.push(`<script type="module" src="/${entry}"></script>`)
        } else if (config.mode === 'production' && assetManifest) {
            let entryManifest = assetManifest[entry]
            
            if (entryManifest.css) {
                entryManifest.css.forEach(function (cssAsset) {
                    assets.push(`<link rel="stylesheet" href="/${cssAsset}" />`)
                });
            }

            assets.push(`<script type="module" src="/${entryManifest.file}"></script>`)
        }

        $('head').append(assets.join('\n'))

        return $.html()
    }

    function generateHTMLFiles() {
        let inputs: string[]

        if (typeof inputOptions.input === 'string') {
            inputs = [inputOptions.input]
        } else if (Array.isArray(inputOptions.input)) {
            inputs = inputOptions.input
        } else {
            inputs = Object.values(inputOptions.input)
        }

        const graphicsDir = path.join(process.cwd(), 'graphics')
        const dashboardDir = path.join(process.cwd(), 'dashboard')

        if (fs.existsSync(graphicsDir)) fs.rmSync(graphicsDir, { recursive: true, force: true })
        if (fs.existsSync(dashboardDir)) fs.rmSync(dashboardDir, { recursive: true, force: true })

        fs.mkdirSync(graphicsDir)
        fs.mkdirSync(dashboardDir)

        const templates = {} as {[key: string]: string}

        inputs.forEach(input => {
            const type = path.basename(path.dirname(input))
            const name = path.basename(input, path.extname(input))

            const html = injectAssets(type === 'dashboard' ? dashboardTemplate : graphicTemplate, input.replace(/^(\.\/)/, ''))

            templates[`${type}/${name}.html`] = html
        })

        for (const [filePath, template] of Object.entries(templates)) {
            fs.writeFileSync(path.join(process.cwd(), filePath), template)
        }
    }

    return {
        name: 'nodecg',
        config: (): UserConfig => {
            const bundleName = path.basename(process.cwd())

            return {
                build: {
                    manifest: true
                },
                base: `/bundles/${bundleName}/`
            }
        },

        configResolved(resolvedConfig: ResolvedConfig) {
            config = resolvedConfig

            graphicTemplate = fs.readFileSync(path.join(process.cwd(), 'src/graphics/template.html'))
            dashboardTemplate = fs.readFileSync(path.join(process.cwd(), 'src/dashboard/template.html'))
        },

        buildStart(options: InputOptions) {
            // dev inject

            inputOptions = options

            if (!inputOptions?.input || config.mode !== 'development') return

            generateHTMLFiles()
        },

        writeBundle() {
            // prod inject

            if (!inputOptions?.input || config.mode !== 'production') return
            
            try {
                // would be nice to not have to re-read the file from disk but I don't see another way
                // relevant: https://github.com/vitejs/vite/blob/a9dfce38108e796e0de0e3b43ced34d60883cef3/packages/vite/src/node/ssr/ssrManifestPlugin.ts
                assetManifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), config.build.outDir, 'manifest.json')).toString())
            } catch (err) {
                console.error("vite-plugin-nodecg: Failed to load manifest.json from build directory. HTML files won't be generated.")
                return
            }

            generateHTMLFiles()
        }
    }
}
