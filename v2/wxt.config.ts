import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'extension-build',
  vite: () => ({ plugins: [react()] }),
  manifest: {
    name: 'PK Session',
    version: '2026.9.2',
    version_name: '2026.09.02',
    description: 'Des sessions Chrome vivantes, versionnees et restaurables.',
    minimum_chrome_version: '120',
    permissions: ['tabs', 'tabGroups', 'webNavigation', 'storage', 'alarms', 'unlimitedStorage'],
    host_permissions: ['<all_urls>'],
    icons: { 16: 'icon-16.png', 32: 'icon-32.png', 48: 'icon-48.png', 128: 'icon-128.png' },
    action: {
      default_title: 'Ouvrir PK Session',
      default_icon: { 16: 'icon-16.png', 32: 'icon-32.png', 48: 'icon-48.png', 128: 'icon-128.png' },
    },
  },
});
