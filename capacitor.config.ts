import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pltracking.app',
  appName: 'PL Tracking',
  webDir: 'out',
  server: {
    iosScheme: 'https',
    allowNavigation: ['*'],
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    Camera: {
      permissions: {
        camera: 'Wir benötigen Zugriff auf Ihre Kamera, um Fotos für Ihre PLs aufzunehmen.',
        photos: 'Wir benötigen Zugriff auf Ihre Fotos, um Bilder auszuwählen.',
      },
    },
  },
};

export default config;
