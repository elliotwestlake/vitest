import { fileURLToPath } from 'url'
// eslint-disable-next-line no-restricted-imports
import { resolve } from 'path'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import sirv from 'sirv'
import type { Plugin } from 'vite'
import { resolvePath } from 'mlly'

const stubsNames = [
  'fs',
  'local-pkg',
  'module',
  'noop',
  'perf_hooks',
]

export default (base = '/'): Plugin[] => {
  const pkgRoot = resolve(fileURLToPath(import.meta.url), '../..')
  const distRoot = resolve(pkgRoot, 'dist')

  return [
    nodePolyfills({
      include: null,
    }),
    {
      enforce: 'pre',
      name: 'vitest:browser',
      async resolveId(id, _, ctx) {
        if (ctx.ssr)
          return

        if (id === '/__vitest_index__') {
          const result = await resolvePath('vitest')
          return result
        }

        id = normalizeId(id)

        if (stubsNames.includes(id))
          return resolve(pkgRoot, 'stubs', id)

        return null
      },
      async configureServer(server) {
        server.middlewares.use(
          base,
          sirv(resolve(distRoot, 'client'), {
            single: false,
            dev: true,
          }),
        )
      },
    },
  ]
}

function normalizeId(id: string, base?: string): string {
  if (base && id.startsWith(base))
    id = `/${id.slice(base.length)}`

  return id
    .replace(/^\/@id\/__x00__/, '\0') // virtual modules start with `\0`
    .replace(/^\/@id\//, '')
    .replace(/^__vite-browser-external:/, '')
    .replace(/^node:/, '')
    .replace(/[?&]v=\w+/, '?') // remove ?v= query
    .replace(/\?$/, '') // remove end query mark
}