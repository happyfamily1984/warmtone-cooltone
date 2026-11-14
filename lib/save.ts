import { Capacitor } from "@capacitor/core";

/** 생성된 이미지를 저장한다. 앱(APK)에서는 공유 시트를 열고, 브라우저에서는 다운로드한다. */
export async function saveImage(dataUrl: string, name: string) {
  const ext = dataUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
  const fileName = `${name.replace(/[^\p{L}\p{N}_-]+/gu, "_")}_${Date.now()}.${ext}`;

  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: dataUrl.slice(dataUrl.indexOf(",") + 1),
      directory: Directory.Cache,
    });
    await Share.share({ files: [uri], dialogTitle: "사진 저장 / 공유" }).catch(() => {});
    return;
  }

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}
