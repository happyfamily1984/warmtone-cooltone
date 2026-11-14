import { ApiError, errorResponse, generateImage, imagePart } from "@/lib/gemini";
import { SEASON_LABEL, type Season } from "@/lib/types";

export const maxDuration = 60;

const SEASON_EN: Record<Season, string> = {
  spring: "warm spring (bright, clear warm colors)",
  summer: "cool summer (soft, muted cool colors)",
  autumn: "warm autumn (deep, earthy warm colors)",
  winter: "cool winter (vivid, high-contrast cool colors)",
};

export async function POST(req: Request) {
  try {
    const { image, season, look } = await req.json();
    if (!(season in SEASON_LABEL)) throw new ApiError("잘못된 요청이에요.", 400);
    const name = String(look?.name || "").slice(0, 60);
    const description = String(look?.description || "").slice(0, 400);

    const prompt = `Edit this selfie to show the same person wearing professionally applied makeup.

Makeup look: "${name}" — ${description}
Personal color type: ${SEASON_EN[season as Season]}. Use shades that flatter this type.

Rules:
- Keep the person's identity, facial features, face shape, skin tone, expression, hair, pose, clothing and background exactly the same.
- Only add makeup: even natural-looking base, eyeshadow, eyeliner/mascara, blush and lip color matching the look.
- Photorealistic result, same framing and lighting as the original photo. No text or watermark.`;

    const out = await generateImage([imagePart(image), { text: prompt }]);
    return Response.json({ image: out });
  } catch (e) {
    return errorResponse(e);
  }
}
