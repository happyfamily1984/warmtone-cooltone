const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
export const IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/** "data:image/jpeg;base64,...." → Gemini inline_data part */
export function imagePart(dataUrl: unknown): Part {
  if (typeof dataUrl !== "string") {
    throw new ApiError("사진이 전달되지 않았어요.", 400);
  }
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl,
  );
  if (!m) throw new ApiError("지원하지 않는 사진 형식이에요.", 400);
  return { inline_data: { mime_type: m[1], data: m[2] } };
}

async function generate(
  model: string,
  parts: Part[],
  generationConfig: Record<string, unknown>,
) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new ApiError(
      "서버에 GEMINI_API_KEY 환경변수가 설정되지 않았어요. .env.local 또는 배포 환경에 키를 추가해 주세요.",
      500,
    );
  }
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || `Gemini API 오류 (${res.status})`;
    throw new ApiError(msg, res.status === 429 ? 429 : 502);
  }
  const cand = json?.candidates?.[0];
  if (!cand?.content?.parts?.length) {
    const reason =
      json?.promptFeedback?.blockReason || cand?.finishReason || "UNKNOWN";
    throw new ApiError(
      `결과를 만들지 못했어요 (${reason}). 다른 사진으로 다시 시도해 주세요.`,
      422,
    );
  }
  return cand.content.parts as Array<Record<string, any>>;
}

export async function generateJson<T>(
  parts: Part[],
  responseSchema: unknown,
): Promise<T> {
  const out = await generate(TEXT_MODEL, parts, {
    responseMimeType: "application/json",
    responseSchema,
    temperature: 0.2,
  });
  const text = out
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("분석 결과를 해석하지 못했어요. 다시 시도해 주세요.", 502);
  }
}

/** Returns a data URL of the generated image. */
export async function generateImage(parts: Part[]): Promise<string> {
  const out = await generate(IMAGE_MODEL, parts, {
    responseModalities: ["TEXT", "IMAGE"],
  });
  for (const p of out) {
    const d = p.inlineData || p.inline_data;
    if (d?.data) return `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}`;
  }
  throw new ApiError("이미지가 생성되지 않았어요. 다시 시도해 주세요.", 422);
}

export function errorResponse(e: unknown) {
  const status = e instanceof ApiError ? e.status : 500;
  const error = e instanceof Error ? e.message : "알 수 없는 오류가 발생했어요.";
  return Response.json({ error }, { status });
}
