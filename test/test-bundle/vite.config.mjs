import { defineConfig } from 'vite'
import NodeCGPlugin from '../../dist'

export default defineConfig(() => {
    return {
        plugins: [
            NodeCGPlugin({
                inputs: {
                    'graphics/special_graphic.js':
                        './templates/special_template.html',
                    'graphics/*/main.js': './templates/graphics.html',
                    'dashboard/*/main.js': './templates/dashboard.html',
                },
            }),
        ],
        build: {
            rollupOptions: {
                output: {
                    assetFileNames: 'assets/[name][extname]',
                    chunkFileNames: '[name].js',
                },
            },
        },
    }
})
