"use client";

import { useEffect, useRef, useState } from "react";

const MAX = 1024;

function toJpeg(src: CanvasImageSource, w: number, h: number, mirror = false) {
  const scale = Math.min(1, MAX / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function Camera({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOn(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("카메라를 열 수 없어요. 권한을 허용하거나 아래에서 사진을 선택해 주세요.");
    }
  };

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const url = toJpeg(v, v.videoWidth, v.videoHeight, true);
    stop();
    onCapture(url);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      onCapture(toJpeg(bmp, bmp.width, bmp.height));
    } catch {
      setError("이 사진은 열 수 없어요. 다른 사진을 선택해 주세요.");
    }
  };

  return (
    <div className="camera">
      <div className="viewfinder">
        {on ? (
          <>
            <video ref={videoRef} playsInline muted />
            <div className="face-guide" aria-hidden />
          </>
        ) : (
          <div className="viewfinder-empty">
            <span>🤳</span>
            <p>얼굴이 가이드 안에 들어오게<br />정면에서 찍어 주세요</p>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {on ? (
        <div className="row">
          <button className="btn ghost" onClick={stop}>취소</button>
          <button className="btn primary grow" onClick={shoot}>촬영</button>
        </div>
      ) : (
        <div className="col">
          <button className="btn primary" onClick={start}>셀카 찍기</button>
          <label className="btn ghost">
            앨범에서 선택
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
        </div>
      )}

      <ul className="tips">
        <li>창가 자연광에서, 노메이크업에 가까울수록 정확해요</li>
        <li>필터·뷰티 보정은 꺼 주세요</li>
        <li>머리카락이 얼굴을 가리지 않게 해 주세요</li>
      </ul>
    </div>
  );
}
