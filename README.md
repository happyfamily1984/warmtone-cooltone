# 웜톤쿨톤

셀카 한 장으로 퍼스널 컬러(웜톤/쿨톤, 4계절)를 진단하고, 어울리는 화장법과
내 얼굴에 메이크업을 입힌 예시 사진, 그 사진으로 컨셉별 코디 사진까지 만들어 주는 모바일 웹앱.

## 흐름

1. **셀카** — 카메라 촬영 또는 앨범 선택 (브라우저에서 1024px로 축소)
2. **톤 진단** — 계절 타입, 어울리는/피할 색, 부위별 화장법
3. **메이크업** — 추천 룩 3가지를 내 사진에 적용한 이미지 생성
4. **코디** — 화장한 사진으로 오피스·데이트·스트릿 등 컨셉별 착장 이미지 생성 (직접 입력 가능)

## 실행

```bash
cp .env.example .env.local   # GEMINI_API_KEY 입력
npm install
npm run dev
```

카메라는 HTTPS 또는 localhost에서만 동작합니다. Vercel에 배포할 때는 프로젝트 환경변수에 `GEMINI_API_KEY`를 추가하세요.

## 구조

- `app/page.tsx` — 4단계 UI
- `components/Camera.tsx` — 셀카 촬영/업로드
- `app/api/analyze` — 톤 분석 (Gemini, JSON 스키마 응답)
- `app/api/makeup`, `app/api/outfit` — 이미지 생성 (Gemini 이미지 모델)
- `lib/gemini.ts` — API 호출, `lib/types.ts` — 타입과 코디 컨셉 목록

사진은 서버에 저장하지 않고 요청 처리에만 사용합니다.
