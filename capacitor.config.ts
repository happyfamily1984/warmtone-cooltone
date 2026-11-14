import type { CapacitorConfig } from "@capacitor/cli";

// APK는 배포된 웹앱(APP_URL)을 띄우는 껍데기입니다.
// 빌드 전에 APP_URL=https://<배포 주소> 로 지정하세요.
const url = process.env.APP_URL;

const config: CapacitorConfig = {
  appId: "com.warmtonecooltone.app",
  appName: "웜톤쿨톤",
  webDir: "mobile-shell",
  ...(url ? { server: { url, androidScheme: "https" } } : {}),
};

export default config;
