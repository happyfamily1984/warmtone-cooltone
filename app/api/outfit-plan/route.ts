import { ApiError, errorResponse, generateJson } from "@/lib/gemini";
import { CONCEPTS, SEASON_LABEL, type OutfitPlan, type Season } from "@/lib/types";

export const maxDuration = 60;

const str = { type: "STRING" };
const TYPES = ["top", "outer", "bottom", "skirt", "dress", "shoes", "bag", "accessory"];
const schema = {
  type: "OBJECT",
  properties: {
    title: str,
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: TYPES },
          name: str,
          colorName: str,
          hex: str,
        },
        required: ["type", "name", "colorName", "hex"],
      },
    },
    tip: str,
  },
  required: ["title", "items", "tip"],
};

/** 텍스트 모델만 쓰는 무료 코디 추천. */
export async function POST(req: Request) {
  try {
    const { conceptId, custom, season, colors } = await req.json();
    if (!(season in SEASON_LABEL)) throw new ApiError("잘못된 요청이에요.", 400);
    const concept = CONCEPTS.find((c) => c.id === conceptId);
    const customText = String(custom || "").trim().slice(0, 100);
    if (!concept && !customText) throw new ApiError("컨셉을 선택해 주세요.", 400);

    const palette = Array.isArray(colors)
      ? colors.slice(0, 8).map((c) => `${String(c?.name).slice(0, 20)} ${String(c?.hex).slice(0, 7)}`).join(", ")
      : "";

    const prompt = `You are a fashion stylist. Design one complete outfit.

Concept: ${concept ? `${concept.label} — ${concept.prompt}` : `"${customText}" (user-described concept)`}
Wearer's personal color: ${SEASON_LABEL[season as Season]}
Flattering palette: ${palette}

Return JSON:
- title: short Korean name for this outfit
- items: 4 to 6 pieces forming one coherent outfit. Each has type (${TYPES.join(", ")}), name (specific Korean item name, e.g. "크롭 트위드 재킷"), colorName (Korean), hex (#RRGGBB). Colors near the face (top, outer, dress) must come from the flattering palette; others may be matching neutrals. Use either dress, or top with bottom/skirt.
- tip: one Korean sentence of styling advice for this personal color.`;

    const plan = await generateJson<OutfitPlan>([{ text: prompt }], schema);
    plan.items = (plan.items || []).slice(0, 6);
    return Response.json(plan);
  } catch (e) {
    return errorResponse(e);
  }
}
