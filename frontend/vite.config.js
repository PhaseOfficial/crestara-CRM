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

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
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
