import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fun.tianai.app",
  appName: "湉野AI",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    // captureInput must be false: true overrides the WebView InputConnection
    // and breaks Chinese IME composition (candidate words / 组合输入).
    captureInput: false,
    webContentsDebuggingEnabled: true,
  },
  server: {
    // 允许明文 HTTP（自托管用户常用局域网 HTTP）
    cleartext: true,
    // 不允许导航到任意 URL，保持在 App 内
    allowNavigation: [],
  },
  plugins: {
    Preferences: {
      // 偏好数据存储名称
      group: "TianaiApp",
    },
  },
};

export default config;
