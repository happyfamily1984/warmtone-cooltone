import type { Pt } from "./face";

export interface Shades {
  lip: string;
  blush: string;
  eye: string;
}

const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
// 윗눈꺼풀 라인 + 그 위 쌍꺼풀 라인 → 아이섀도 영역
const EYE_R = [33, 246, 161, 160, 159, 158, 157, 173, 133, 243, 190, 56, 28, 27, 29, 30, 247, 130];
const EYE_L = [263, 466, 388, 387, 386, 385, 384, 398, 362, 463, 414, 286, 258, 257, 259, 260, 467, 359];
const CHEEK_R = 50;
const CHEEK_L = 280;
const FACE_R = 234;
const FACE_L = 454;
const CHIN = 152;
const FOREHEAD = 10;

const HEX = /^#[0-9a-fA-F]{6}$/;
export const safeHex = (h: string | undefined, fallback: string) => (h && HEX.test(h) ? h : fallback);

function path(ctx: CanvasRenderingContext2D, pts: Pt[], idx: number[]) {
  idx.forEach((i, n) => (n ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y)));
  ctx.closePath();
}

function layer(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** 번지는 가장자리를 가진 색 레이어를 만들어 원본 위에 합성한다. */
function paint(
  ctx: CanvasRenderingContext2D,
  draw: (l: CanvasRenderingContext2D) => void,
  blur: number,
  passes: [GlobalCompositeOperation, number][],
) {
  const { width: w, height: h } = ctx.canvas;
  const [c, l] = layer(w, h);
  l.filter = `blur(${blur.toFixed(1)}px)`;
  draw(l);
  for (const [op, alpha] of passes) {
    ctx.save();
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
}

/** 셀카 위에 립·블러셔·아이섀도를 입힌 캔버스를 반환한다. strength: 0~1 */
export function renderMakeup(img: HTMLImageElement, pts: Pt[], shades: Shades, strength = 0.6) {
  const [canvas, ctx] = layer(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  const faceW = Math.hypot(pts[FACE_L].x - pts[FACE_R].x, pts[FACE_L].y - pts[FACE_R].y);
  const s = Math.max(0, Math.min(1, strength));

  // 블러셔
  paint(
    ctx,
    (l) => {
      for (const i of [CHEEK_R, CHEEK_L]) {
        const { x, y } = pts[i];
        const r = faceW * 0.2;
        const g = l.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, shades.blush);
        g.addColorStop(1, shades.blush + "00");
        l.fillStyle = g;
        l.beginPath();
        l.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
        l.fill();
      }
    },
    faceW * 0.02,
    [["multiply", 0.32 * s], ["source-over", 0.1 * s]],
  );

  // 아이섀도
  paint(
    ctx,
    (l) => {
      l.fillStyle = shades.eye;
      for (const eye of [EYE_R, EYE_L]) {
        l.beginPath();
        path(l, pts, eye);
        l.fill();
      }
    },
    faceW * 0.012,
    [["multiply", 0.75 * s], ["source-over", 0.12 * s]],
  );

  // 립
  paint(
    ctx,
    (l) => {
      l.fillStyle = shades.lip;
      l.beginPath();
      path(l, pts, LIPS_OUTER);
      path(l, pts, LIPS_INNER);
      l.fill("evenodd");
    },
    faceW * 0.006,
    [["color", 0.7 * s], ["multiply", 0.45 * s]],
  );

  return canvas;
}

/** 얼굴 아래에 옷 색 천을 대본 모습(컬러 드레이핑)을 그린다. */
export function renderDrape(src: HTMLCanvasElement | HTMLImageElement, pts: Pt[], hex: string) {
  const sw = "naturalWidth" in src ? src.naturalWidth : src.width;
  const sh = "naturalHeight" in src ? src.naturalHeight : src.height;
  const chin = pts[CHIN];
  const faceH = Math.hypot(chin.x - pts[FOREHEAD].x, chin.y - pts[FOREHEAD].y);
  const faceW = Math.hypot(pts[FACE_L].x - pts[FACE_R].x, pts[FACE_L].y - pts[FACE_R].y);

  // 얼굴 중심으로 3:4 크롭, 아래쪽은 천이 차지한다
  const w = Math.min(sw, faceW * 2.2);
  const h = (w * 4) / 3;
  const cx = (pts[FACE_L].x + pts[FACE_R].x) / 2;
  const x0 = Math.max(0, Math.min(sw - w, cx - w / 2));
  const y0 = chin.y + faceH * 0.75 - h; // 턱 아래 여백을 고정

  const [canvas, ctx] = layer(Math.round(w), Math.round(h));
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, -x0, -y0);

  // 둥근 네크라인 모양의 천
  const neckY = chin.y - y0 + faceH * 0.2;
  const mid = chin.x - x0;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.moveTo(0, neckY - faceH * 0.22);
  ctx.bezierCurveTo(mid - faceW * 0.55, neckY - faceH * 0.1, mid - faceW * 0.4, neckY + faceH * 0.1, mid, neckY + faceH * 0.1);
  ctx.bezierCurveTo(mid + faceW * 0.4, neckY + faceH * 0.1, mid + faceW * 0.55, neckY - faceH * 0.1, canvas.width, neckY - faceH * 0.22);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();
  // 천의 음영
  const g = ctx.createLinearGradient(0, neckY, 0, canvas.height);
  g.addColorStop(0, "rgba(0,0,0,0.10)");
  g.addColorStop(0.4, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fill();
  return canvas;
}
