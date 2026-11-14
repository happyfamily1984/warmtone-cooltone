export type Season = "spring" | "summer" | "autumn" | "winter";

export interface Swatch {
  name: string;
  hex: string;
}

export interface Look {
  name: string;
  description: string;
}

export interface Analysis {
  tone: "warm" | "cool";
  season: Season;
  confidence: number;
  summary: string;
  features: { skin: string; eyes: string; hair: string };
  bestColors: Swatch[];
  avoidColors: Swatch[];
  makeup: { base: string; eyes: string; blush: string; lips: string; tip: string };
  looks: Look[];
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: "봄 웜톤",
  summer: "여름 쿨톤",
  autumn: "가을 웜톤",
  winter: "겨울 쿨톤",
};

export interface Concept {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

export const CONCEPTS: Concept[] = [
  { id: "office", label: "오피스룩", emoji: "💼", prompt: "a polished modern office outfit: tailored blazer, blouse and slacks, in a bright office lobby" },
  { id: "date", label: "데이트룩", emoji: "🌷", prompt: "a soft romantic date outfit: feminine knit or blouse with a flowing skirt, at a cozy cafe terrace" },
  { id: "street", label: "스트릿", emoji: "🧢", prompt: "a trendy streetwear outfit: oversized jacket, graphic layers and wide pants, on a city street" },
  { id: "minimal", label: "미니멀", emoji: "🤍", prompt: "a clean minimal outfit: simple high-quality basics with relaxed tailoring, against a plain studio wall" },
  { id: "formal", label: "포멀/하객룩", emoji: "🥂", prompt: "an elegant formal outfit suitable for a wedding guest: refined dress or suit set, in an elegant hall" },
  { id: "casual", label: "캐주얼", emoji: "👟", prompt: "a comfortable everyday casual outfit: sweatshirt or cardigan with denim, in a sunny park" },
  { id: "vacation", label: "휴양지룩", emoji: "🏖️", prompt: "a breezy resort outfit: light linen or summer dress with a straw accessory, at a seaside resort" },
  { id: "y2k", label: "Y2K", emoji: "💿", prompt: "a playful Y2K-inspired outfit: cropped top, low-rise denim and bold accessories, with a flash-photo look" },
];
