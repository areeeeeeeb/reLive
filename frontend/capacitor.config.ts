import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hackathon.relive',
  appName: 'reLive',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
