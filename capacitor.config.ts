import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The native apps load the live site, so a deploy to Vercel updates the apps too.
 * native/www only holds the page shown when the phone is offline.
 */
const config: CapacitorConfig = {
  appId: "com.kkggr2.bottega",
  appName: "Bottega",
  webDir: "native/www",
  backgroundColor: "#111512",
  server: {
    // CAP_SERVER_URL=http://localhost:3000 npx cap sync ios  → test against your own Mac.
    url: process.env.CAP_SERVER_URL ?? "https://bottega-sable.vercel.app",
    cleartext: Boolean(process.env.CAP_SERVER_URL?.startsWith("http://")),
    errorPath: "offline.html",
  },
  ios: {
    contentInset: "never",
    scheme: "Bottega",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: "#2F3B2C",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "DEFAULT",
    },
  },
};

export default config;
