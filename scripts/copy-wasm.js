// 얼굴 인식 엔진(wasm)을 public/ 으로 복사한다. npm install 후 자동 실행.
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "../node_modules/@mediapipe/tasks-vision/wasm");
const dst = path.join(__dirname, "../public/mediapipe/wasm");
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
