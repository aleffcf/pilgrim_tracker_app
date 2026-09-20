require('dotenv').config();

module.exports = {
  expo: {
    name: "app-peregrinos",
    slug: "peregrinos",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "appperegrinos",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Precisamos da sua localização para mostrar sua posição no mapa.",
      },
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.appperegrinos",
    },
    android: {
      // Permite HTTP sem TLS — necessário enquanto o backend não tem HTTPS.
      // Remover quando o backend estiver hospedado com certificado válido.
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
      ],
      config: {
        googleMaps: {
          // Lida do .env local (dev) ou dos EAS Secrets (build na nuvem) —
          // nunca fica hardcoded aqui.
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      package: "com.anonymous.appperegrinos",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-secure-store",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Permita o acesso à localização para que seu grupo possa te encontrar durante a romaria.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "fb3f1cc4-eb65-495e-89b7-07e012659a36",
      },
    },
    owner: "aleffcfs-team",
  },
};