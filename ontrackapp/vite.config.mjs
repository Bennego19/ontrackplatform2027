import { defineConfig, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';

// Existing components use JSX in .js files. Transform them before Vite scans
// imports so the project can migrate without renaming every component.
const jsxInJs = {
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (/\/src\/.*\.js$/.test(id)) {
      return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
    }
  }
};

const proxy = { '/api': 'http://localhost:3000' };

export default defineConfig({
  plugins: [jsxInJs, react()],
  optimizeDeps: { entries: ['index.html'], rolldownOptions: { moduleTypes: { '.js': 'jsx' } } },
  server: { port: 3001, proxy },
  preview: { port: 3002, proxy },
  build: { outDir: 'build' },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/setupTests.js'] }
});
