import { ApiError, errorResponse, generateImage, imagePart } from "@/lib/gemini";
import { CONCEPTS } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { image, conceptId, custom, colors } = await req.json();
    const concept = CONCEPTS.find((c) => c.id === conceptId);
    const customText = String(custom || "").trim().slice(0, 200);
    if (!concept && !customText) throw new ApiError("컨셉을 선택해 주세요.", 400);

    const palette = Array.isArray(colors)
      ? colors
          .slice(0, 8)
          .map((c) => `${String(c?.name).slice(0, 20)} (${String(c?.hex).slice(0, 7)})`)
          .join(", ")
      : "";

    const outfit = concept
      ? concept.prompt
      : `an outfit matching this concept described by the user: "${customText}"`;

    const prompt = `Create a photorealistic fashion photo of the same person from this photo, shown from the knees up, wearing ${outfit}.

Rules:
- The face must stay the same person: keep identity, facial features, skin tone, hairstyle and the makeup exactly as in the photo.
- Choose clothing colors mainly from this personal color palette that flatters them: ${palette || "colors that flatter their skin tone"}.
- Natural body proportions and a relaxed standing pose, soft flattering light, vertical 3:4 composition.
- No text, logos or watermark.`;

    const out = await generateImage([imagePart(image), { text: prompt }]);
    return Response.json({ image: out });
  } catch (e) {
    return errorResponse(e);
  }
}
