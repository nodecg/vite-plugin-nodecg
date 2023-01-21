import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'
import { minimatch } from 'minimatch'
import type { InputOptions } from 'rollup'
import type {
    Manifest,
    ManifestChunk,
    Plugin,
    ResolvedConfig,
    UserConfig,
} from 'vite'

type PluginOptions = { templates: { [key: string]: string } }

export default function viteNodeCGPlugin(pluginOptions: PluginOptions): Plugin {
    const bundleName = path.basename(process.cwd())

    const templateConfig = pluginOptions.templates ?? {
        './src/graphics/**.ts': './src/graphics/template.html',
        './src/dashboard/**.ts': './src/dashboard/template.html',
    }
    const templates = {} as { [key: string]: Buffer }

    for (const [matchPath, templatePath] of Object.entries(templateConfig)) {
        const fullPath = path.join(process.cwd(), templatePath)
        templates[matchPath] = fs.readFileSync(fullPath)
    }

    let config: ResolvedConfig
    let assetManifest: Manifest
    let protocol: string
    let socketAddr: string

    let inputOptions: InputOptions

    // take the template html and inject script and css assets into <head>
    function injectAssetsTags(html: string | Buffer, entry: string) {
        const $ = cheerio.load(html)

        const tags = []

        if (config.mode === 'development') {
            tags.push(
                `<script type="module" src="${protocol}://${path.join(
                    socketAddr,
                    '@vite/client'
                )}"></script>`
            )
            tags.push(
                `<script type="module" src="${protocol}://${path.join(
                    socketAddr,
                    'bundles',
                    bundleName,
                    entry
                )}"></script>`
            )
        } else if (config.mode === 'production' && assetManifest) {
            let entryChunk = assetManifest[entry]

            function generateCssTags(
                chunk: ManifestChunk,
                alreadyProcessed: string[] = []
            ) {
                chunk.css?.forEach((cssPath) => {
                    if (alreadyProcessed.includes(cssPath)) return // de-dupe assets

                    tags.push(
                        `<link rel="stylesheet" href="${path.join(
                            config.base,
                            cssPath
                        )}" />`
                    )

                    alreadyProcessed.push(cssPath)
                })

                // recurse
                chunk.imports?.forEach((importPath) => {
                    generateCssTags(assetManifest[importPath], alreadyProcessed)
                })
            }

            generateCssTags(entryChunk)

            tags.push(
                `<script type="module" src="${path.join(
                    config.base,
                    entryChunk.file
                )}"></script>`
            )
        }

        $('head').append(tags.join('\n'))

        return $.html()
    }

    // for each input (graphics & dashboard panels) create an html doc and emit to disk
    function generateHTMLFiles() {
        let inputs: string[]

        // populate inputs, taking into account "input" can come in 3 forms
        if (typeof inputOptions.input === 'string') {
            inputs = [inputOptions.input]
        } else if (Array.isArray(inputOptions.input)) {
            inputs = inputOptions.input
        } else {
            inputs = Object.values(inputOptions.input)
        }

        const graphicsDir = path.join(process.cwd(), 'graphics')
        const dashboardDir = path.join(process.cwd(), 'dashboard')

        // clear build directories
        if (fs.existsSync(graphicsDir))
            fs.rmSync(graphicsDir, { recursive: true, force: true })
        if (fs.existsSync(dashboardDir))
            fs.rmSync(dashboardDir, { recursive: true, force: true })

        fs.mkdirSync(graphicsDir)
        fs.mkdirSync(dashboardDir)

        const htmlDocs = {} as { [key: string]: string }

        // generate string html for each input
        inputs.forEach((input) => {
            const type = path.basename(path.dirname(input))
            const name = path.basename(input, path.extname(input))

            const templateMatchPath = Object.keys(templates).find(
                (matchPath) => {
                    return minimatch(input, matchPath)
                }
            )

            const template = templates[templateMatchPath]

            if (!template) {
                console.warn(
                    `vite-plugin-nodecg: No template found to match input "${input}". This graphic/dashboard will not be built.`
                )
                return
            }

            const html = injectAssetsTags(
                template,
                input.replace(/^(\.\/)/, '')
            )

            htmlDocs[`${type}/${name}.html`] = html
        })

        // write each html doc to disk
        for (const [filePath, htmlDoc] of Object.entries(htmlDocs)) {
            fs.writeFileSync(path.join(process.cwd(), filePath), htmlDoc)
        }
    }

    return {
        name: 'nodecg',

        // validate and setup defaults in user's vite config
        config: (_config, { mode }): UserConfig => {
            protocol = _config?.server?.https ? 'https' : 'http'
            socketAddr = `${
                typeof _config?.server?.host === 'string'
                    ? _config?.server?.host
                    : 'localhost'
            }:${_config?.server?.port?.toString() ?? '3000'}`

            return {
                build: {
                    manifest: true,
                    outDir: 'shared/dist',
                },
                server: {
                    origin: `${protocol}://${socketAddr}`,
                },
                base: `/bundles/${bundleName}/${
                    mode === 'development' ? '' : 'shared/dist/'
                }`,
            }
        },

        configResolved(resolvedConfig: ResolvedConfig) {
            // Capture resolved config for use in injectAssets
            config = resolvedConfig
        },

        buildStart(options: InputOptions) {
            // capture inputOptions for use in generateHtmlFiles in both dev & prod
            inputOptions = options

            if (!inputOptions?.input || config.mode !== 'development') return

            // dev inject
            generateHTMLFiles()
        },

        writeBundle() {
            if (!inputOptions?.input || config.mode !== 'production') return

            try {
                // would be nice to not have to read the asset manifest from disk but I don't see another way
                // relevant: https://github.com/vitejs/vite/blob/a9dfce38108e796e0de0e3b43ced34d60883cef3/packages/vite/src/node/ssr/ssrManifestPlugin.ts
                assetManifest = JSON.parse(
                    fs
                        .readFileSync(
                            path.join(
                                process.cwd(),
                                config.build.outDir,
                                'manifest.json'
                            )
                        )
                        .toString()
                )
            } catch (err) {
                console.error(
                    "vite-plugin-nodecg: Failed to load manifest.json from build directory. HTML files won't be generated."
                )
                return
            }

            // prod inject
            generateHTMLFiles()
        },
    }
}
