import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mosquemanagement.app',
  appName: 'Mosque Management',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
