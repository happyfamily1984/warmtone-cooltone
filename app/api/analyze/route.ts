import { errorResponse, generateJson, imagePart } from "@/lib/gemini";
import type { Analysis } from "@/lib/types";

export const maxDuration = 60;

const str = { type: "STRING" };
const swatches = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: { name: str, hex: str },
    required: ["name", "hex"],
  },
};

const schema = {
  type: "OBJECT",
  properties: {
    tone: { type: "STRING", enum: ["warm", "cool"] },
    season: { type: "STRING", enum: ["spring", "summer", "autumn", "winter"] },
    confidence: { type: "INTEGER" },
    summary: str,
    features: {
      type: "OBJECT",
      properties: { skin: str, eyes: str, hair: str },
      required: ["skin", "eyes", "hair"],
    },
    bestColors: swatches,
    avoidColors: swatches,
    makeup: {
      type: "OBJECT",
      properties: { base: str, eyes: str, blush: str, lips: str, tip: str },
      required: ["base", "eyes", "blush", "lips", "tip"],
    },
    looks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: str, description: str },
        required: ["name", "description"],
      },
    },
  },
  required: [
    "tone", "season", "confidence", "summary", "features",
    "bestColors", "avoidColors", "makeup", "looks",
  ],
};

const PROMPT = `You are a professional personal color consultant. Analyze the selfie.

Judge the person's undertone from skin (cheek, forehead, jaw), natural eye color and hair color. Compensate for obvious lighting or white-balance casts, and say so in the summary if lighting makes the result uncertain.

Return JSON:
- tone: "warm" or "cool"
- season: spring (warm, bright) / summer (cool, soft) / autumn (warm, deep) / winter (cool, vivid). Must be consistent with tone.
- confidence: 0-100, how sure you are given photo quality
- summary: 2-3 sentences in Korean explaining why
- features: short Korean descriptions of skin, eyes, hair coloring
- bestColors: 8 flattering colors (Korean name + #RRGGBB hex)
- avoidColors: 4 colors to avoid (Korean name + #RRGGBB hex)
- makeup: Korean advice for base, eyes, blush, lips (specific shades/finishes), plus one practical tip
- looks: exactly 3 distinct makeup looks that suit this person (e.g. daily, date, glam). name: short Korean name. description: one Korean sentence listing the concrete shades for eyes, cheeks and lips.

All text in Korean. If no single clear human face is visible, still answer with confidence 0 and explain in summary.`;

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    const result = await generateJson<Analysis>(
      [imagePart(image), { text: PROMPT }],
      schema,
    );
    result.tone = result.season === "spring" || result.season === "autumn" ? "warm" : "cool";
    result.looks = (result.looks || []).slice(0, 3);
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
