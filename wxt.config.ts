import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  outDir: 'extension-build',
  vite: () => ({
    plugins: [react(), tailwindcss()],
  }),
  manifest: {
    name: 'PK Session',
    description: 'Versionnez vos sessions Chrome et visualisez votre parcours de navigation.',
    minimum_chrome_version: '120',
    permissions: ['tabs', 'tabGroups', 'webNavigation', 'storage', 'alarms', 'favicon', 'unlimitedStorage'],
    optional_permissions: ['history'],
    action: { default_title: 'Ouvrir PK Session' },
  },
});
