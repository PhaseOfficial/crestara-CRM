import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import frappeui from 'frappe-ui/vite'

const esbuildLucidePlugin = {
  name: 'esbuild-lucide-icons',
  setup(build) {
    build.onResolve({ filter: /^~icons\// }, (args) => ({
      path: args.path,
      external: true,
    }))
  },
}

// Rewrites unsupported regex lookbehind assertions in vendor code for Safari < 16.4 compatibility
const safariRegexCompatPlugin = {
  name: 'safari-regex-compat-plugin',
  transform(code) {
    if (code && code.includes('(?<=^|[^`])')) {
      return {
        code: code.replaceAll('(?<=^|[^`])', '(?:^|[^`])'),
        map: null,
      }
    }
  },
}

// Injects fallback CSS declarations before modern color-mix() properties for Safari < 16.2 and older WebKit
const safariCssCompatPlugin = {
  name: 'safari-css-compat-plugin',
  enforce: 'post',
  generateBundle(options, bundle) {
    for (const [fileName, asset] of Object.entries(bundle)) {
      if (fileName.endsWith('.css') && typeof asset.source === 'string') {
        asset.source = asset.source.replace(
          /(background-color|color|border-color):(color-mix\(in srgb,\s*var\((--[a-zA-Z0-9_-]+)[^)]*\)[^;}]*\))/g,
          function (match, prop, expr, varName) {
            return prop + ':var(' + varName + ');' + prop + ':' + expr
          }
        )
      }
    }
  },
}

const mockOnboardingPlugin = {
  name: 'mock-onboarding-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.includes('/api/method/frappe.onboarding.get_onboarding_status')) {
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            message: {
              frappecrm_onboarding_status: [
                { name: 'setup_your_password', completed: false },
                { name: 'invite_your_team', completed: false },
                { name: 'create_first_task', completed: false },
              ],
            },
          }),
        )
        return
      }
      if (req.url && req.url.includes('/api/method/frappe.onboarding.update_user_onboarding_status')) {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ message: 'ok' }))
        return
      }
      next()
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      safariRegexCompatPlugin,
      safariCssCompatPlugin,
      mockOnboardingPlugin,
      frappeui({
        frappeProxy: false,
        lucideIcons: true,
        jinjaBootData: false,
        buildConfig: false,
      }),
      vue(),
      vueJsx(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      dedupe: [
        'vue',
        'vue-router',
        'frappe-ui',
        'dompurify',
        '@tiptap/core',
        '@tiptap/pm',
        '@tiptap/vue-3',
        'prosemirror-model',
        'prosemirror-state',
        'prosemirror-view',
        'prosemirror-transform',
      ],
    },
    optimizeDeps: {
      include: [
        'feather-icons',
        'tailwind.config.js',
        'prosemirror-state',
        'prosemirror-view',
        'lowlight',
        'interactjs',
      ],
      exclude: ['frappe-ui'],
      esbuildOptions: {
        plugins: [esbuildLucidePlugin],
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
    },
  }
})
