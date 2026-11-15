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
      {on ? (
        <div className="viewfinder">
          <video ref={videoRef} playsInline muted />
          <div className="face-guide" aria-hidden />
        </div>
      ) : (
        <div className="hero-card">
          <img src="/hero.jpg" alt="" width={780} height={546} />
          <button className="shutter" onClick={start} aria-label="셀카 찍기">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 8.500A2.500 2.500 0 0 1 6.500 6h1.200l1.100-1.700h6.400L16.300 6h1.200A2.500 2.500 0 0 1 20 8.500v8a2.500 2.500 0 0 1-2.500 2.500h-11A2.500 2.500 0 0 1 4 16.500Z" />
              <circle cx="12" cy="12.500" r="3.200" />
            </svg>
          </button>
          <p>
            얼굴이 가이드 안에 들어오게
            <br />
            <b>정면에서</b> 찍어 주세요
          </p>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {on ? (
        <div className="row">
          <button className="btn ghost" onClick={stop}>취소</button>
          <button className="btn primary grow" onClick={shoot}>촬영</button>
        </div>
      ) : (
        <div className="col">
          <button className="btn primary cta" onClick={start}>
            셀카 찍기
            <svg viewBox="0 0 24 24" aria-hidden><path d="m9 5 7 7-7 7" /></svg>
          </button>
          <label className="btn ghost">
            <svg viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="4.500" width="18" height="15" rx="3.500" />
              <circle cx="8.500" cy="10" r="1.600" />
              <path d="m4 17 5-4.500 3.500 3 3-2.500L20 16.500" />
            </svg>
            앨범에서 선택
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
        </div>
      )}

      <ul className="tips">
        <li>창가 <b>자연광</b>에서, 노메이크업에 가까울수록 정확해요</li>
        <li>필터·뷰티 보정은 <b>꺼</b> 주세요</li>
        <li>머리카락이 얼굴을 <b>가리지 않게</b> 해 주세요</li>
      </ul>
    </div>
  );
}
