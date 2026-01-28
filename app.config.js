// Dynamic Expo config that injects environment variables at build time
// Credentials are read from .env file (gitignored) and baked into the app

// Load environment variables from .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

export default {
  expo: {
    name: 'Driftmoney',
    slug: 'driftmoney',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'driftmoney',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.driftmoney.acarr',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.googleusercontent.apps.682479545419-5s9t3qjrn6hhbv8rp0bqem5s3ah6oj61',
            ],
          },
        ],
      },
    },
    android: {
      package: 'com.driftmoney.acarr',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-notifications',
        {
          sounds: [],
        },
      ],
      'expo-sqlite',
      'expo-localization',
      '@react-native-community/datetimepicker',
      'expo-web-browser',
      '@react-native-google-signin/google-signin',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '14a7be30-2093-41f0-ad3a-3652ffa7acb6',
      },
      // Service credentials injected at build time
      apiUsername: process.env.API_USERNAME,
      apiPassword: process.env.API_PASSWORD,
      ocrEndpoint: process.env.OCR_ENDPOINT || 'https://api.acarr.org',
      aiEndpoint: process.env.AI_ENDPOINT || 'https://ollama.acarr.org',
    },
    owner: 'carrdevs',
  },
};
