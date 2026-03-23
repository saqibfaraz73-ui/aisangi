import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.eb67ffc92b24438d929644ecd8b3a0dd',
  appName: 'aisangi',
  webDir: 'dist',
  server: {
    url: 'https://eb67ffc9-2b24-438d-9296-44ecd8b3a0dd.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Filesystem: {
      // Enables SAF-based file access on Android 10+
    },
  },
  android: {
    // Allow mixed content for WebView
    allowMixedContent: true,
  }
};

export default config;
