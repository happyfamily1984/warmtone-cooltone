import type { GarmentType, OutfitPlan } from "@/lib/types";
import { safeHex } from "@/lib/makeup";

const SHAPES: Record<GarmentType, React.ReactNode> = {
  top: <path d="M22 8 10 14 4 26l9 5 4-6v31h30V25l4 6 9-5-6-12-12-6c-2 5-18 5-20 0Z" />,
  outer: (
    <>
      <path d="M22 6 8 13 3 40l9 2 3-14v30h34V28l3 14 9-2-5-27-14-7-10 14Z" />
      <path d="M32 20v38" fill="none" />
    </>
  ),
  bottom: <path d="M18 6h28l4 52H36l-4-36-4 36H14Z" />,
  skirt: <path d="M22 8h20l12 46H10Z" />,
  dress: <path d="M24 6h4c1 4 7 4 8 0h4l4 16-6 4 14 32H12l14-32-6-4Z" />,
  shoes: <path d="M6 40c0-6 8-6 12-4l16 8c10 1 24 2 24 8v2H6Z" />,
  bag: (
    <>
      <path d="M12 26h40l4 30H8Z" />
      <path d="M22 26c0-16 20-16 20 0" fill="none" strokeWidth="3" />
    </>
  ),
  accessory: <circle cx="32" cy="32" r="18" fillOpacity="0.25" strokeWidth="5" />,
};

export default function OutfitCard({ plan, face }: { plan: OutfitPlan; face: string }) {
  return (
    <div className="card outfit-card">
      <div className="verdict small">
        <img className="thumb" src={face} alt="" />
        <h3>{plan.title}</h3>
      </div>
      <ul className="garments">
        {plan.items.map((it, i) => {
          const hex = safeHex(it.hex, "#cccccc");
          return (
            <li key={i}>
              <svg viewBox="0 0 64 64" fill={hex} stroke={it.type === "accessory" ? hex : "rgba(0,0,0,.28)"} strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
                {SHAPES[it.type] ?? SHAPES.top}
              </svg>
              <b>{it.name}</b>
              <small>{it.colorName}</small>
            </li>
          );
        })}
      </ul>
      <p className="note">💡 {plan.tip}</p>
    </div>
  );
}
