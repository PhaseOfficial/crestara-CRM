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
    },
  }
})
