// 기기 안에서 얼굴 랜드마크(468점)를 찾는다. 사진은 서버로 보내지 않는다.
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export type Pt = { x: number; y: number };

let loader: Promise<FaceLandmarker> | null = null;

function load() {
  if (!loader) {
    loader = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task" },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
    loader.catch(() => (loader = null));
  }
  return loader;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("사진을 불러오지 못했어요."));
    img.src = src;
  });
}

/** 얼굴이 없으면 null. 좌표는 이미지 픽셀 단위. */
export async function detectFace(img: HTMLImageElement): Promise<Pt[] | null> {
  const lm = await load();
  const face = lm.detect(img).faceLandmarks?.[0];
  if (!face) return null;
  return face.map((p) => ({ x: p.x * img.naturalWidth, y: p.y * img.naturalHeight }));
}
