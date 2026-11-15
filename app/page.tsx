"use client";

import { useEffect, useRef, useState } from "react";
import Camera from "@/components/Camera";
import OutfitCard from "@/components/OutfitCard";
import { detectFace, loadImage, type Pt } from "@/lib/face";
import { renderDrape, renderMakeup, safeHex, type Shades } from "@/lib/makeup";
import { saveImage } from "@/lib/save";
import {
  AI_IMAGES, CONCEPTS, SEASON_LABEL,
  type Analysis, type Look, type OutfitPlan, type Swatch,
} from "@/lib/types";

type Step = "capture" | "analysis" | "makeup" | "outfit";
type Async<T> = { status: "loading" | "done" | "error"; value?: T; error?: string };
type Source = HTMLImageElement | HTMLCanvasElement;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `요청에 실패했어요 (${res.status})`);
  return json as T;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "capture", label: "셀카" },
  { id: "analysis", label: "톤 진단" },
  { id: "makeup", label: "메이크업" },
  { id: "outfit", label: "코디" },
];

const shadesOf = (l: Look): Shades => ({
  lip: safeHex(l.lip, "#b5525c"),
  blush: safeHex(l.blush, "#e8998d"),
  eye: safeHex(l.eye, "#8a6552"),
});

const toJpeg = (c: HTMLCanvasElement) => c.toDataURL("image/jpeg", 0.92);

/** render()가 돌려준 캔버스(또는 이미지)를 화면에 그린다. */
function Painted({ render, deps, label }: { render: () => Source; deps: unknown[]; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const src = render();
    const c = ref.current!;
    c.width = "naturalWidth" in src ? src.naturalWidth : src.width;
    c.height = "naturalHeight" in src ? src.naturalHeight : src.height;
    c.getContext("2d")!.drawImage(src, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} className="painted" role="img" aria-label={label} />;
}

function Swatches({ colors, active, onPick }: { colors: Swatch[]; active?: string; onPick?: (c: Swatch) => void }) {
  return (
    <div className="swatches">
      {colors.map((c, i) => {
        const hex = safeHex(c.hex, "#cccccc");
        const body = (
          <>
            <span style={{ background: hex }} />
            <small>{c.name}</small>
          </>
        );
        return onPick ? (
          <button key={i} className={`swatch ${active === hex ? "on" : ""}`} onClick={() => onPick({ ...c, hex })}>
            {body}
          </button>
        ) : (
          <div key={i} className="swatch">{body}</div>
        );
      })}
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="result loading">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

function AiResult({ gen, alt, onRetry }: { gen: Async<string>; alt: string; onRetry: () => void }) {
  if (gen.status === "loading") return <Loading text="AI가 만드는 중… 10~30초 걸려요" />;
  if (gen.status === "error")
    return (
      <div className="result">
        <p className="error">{gen.error}</p>
        <button className="btn ghost" onClick={onRetry}>다시 시도</button>
      </div>
    );
  return (
    <div className="result">
      <img src={gen.value} alt={alt} />
      <div className="row">
        <button className="btn ghost" onClick={onRetry}>다시 만들기</button>
        <button className="btn ghost" onClick={() => saveImage(gen.value!, alt)}>저장</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("capture");
  const [selfie, setSelfie] = useState("");
  const [selfieImg, setSelfieImg] = useState<HTMLImageElement | null>(null);
  const [face, setFace] = useState<Async<Pt[] | null>>({ status: "loading" });
  const [analysis, setAnalysis] = useState<Async<Analysis> | null>(null);

  const [lookIdx, setLookIdx] = useState(0);
  const [strength, setStrength] = useState(0.6);
  const [original, setOriginal] = useState(false);
  const [aiMakeups, setAiMakeups] = useState<Record<string, Async<string>>>({});

  const [base, setBase] = useState<{ el: Source; url: string } | null>(null); // 코디에 쓸 사진
  const [mode, setMode] = useState<"drape" | "concept">("drape");
  const [drape, setDrape] = useState<Swatch | null>(null);
  const [conceptId, setConceptId] = useState("");
  const [custom, setCustom] = useState("");
  const [plans, setPlans] = useState<Record<string, Async<OutfitPlan>>>({});
  const [aiOutfits, setAiOutfits] = useState<Record<string, Async<string>>>({});

  const a = analysis?.value;
  const pts = face.value || null;
  const look = a?.looks[lookIdx];

  const reset = () => {
    setStep("capture");
    setSelfie("");
    setSelfieImg(null);
    setFace({ status: "loading" });
    setAnalysis(null);
    setLookIdx(0);
    setAiMakeups({});
    setBase(null);
    setDrape(null);
    setConceptId("");
    setPlans({});
    setAiOutfits({});
  };

  const analyze = async (image: string) => {
    setAnalysis({ status: "loading" });
    try {
      const value = await post<Analysis>("/api/analyze", { image });
      setAnalysis({ status: "done", value });
      setDrape(value.bestColors[0] || null);
    } catch (e) {
      setAnalysis({ status: "error", error: (e as Error).message });
    }
  };

  const onCapture = (image: string) => {
    setSelfie(image);
    setStep("analysis");
    analyze(image);
    // 얼굴 위치 찾기는 기기 안에서 동시에 진행
    setFace({ status: "loading" });
    loadImage(image)
      .then(async (img) => {
        setSelfieImg(img);
        setFace({ status: "done", value: await detectFace(img) });
      })
      .catch(() => setFace({ status: "error", error: "얼굴 인식 기능을 불러오지 못했어요." }));
  };

  const madeUp = () => renderMakeup(selfieImg!, pts!, shadesOf(look!), strength);

  const goOutfit = (withMakeup: boolean) => {
    if (withMakeup && selfieImg && pts && look) {
      const el = madeUp();
      setBase({ el, url: toJpeg(el) });
    } else if (selfieImg) {
      setBase({ el: selfieImg, url: selfie });
    }
    setAiOutfits({});
    setMode(pts ? "drape" : "concept");
    setStep("outfit");
  };

  const run = async <T,>(
    set: React.Dispatch<React.SetStateAction<Record<string, Async<T>>>>,
    key: string | number,
    job: () => Promise<T>,
  ) => {
    const put = (v: Async<T>) => set((m) => ({ ...m, [key]: v }));
    put({ status: "loading" });
    try {
      put({ status: "done", value: await job() });
    } catch (e) {
      put({ status: "error", error: (e as Error).message });
    }
  };

  const customOf = (id: string) => (id.startsWith("custom:") ? id.slice(7) : "");
  const labelOf = (id: string) => customOf(id) || CONCEPTS.find((c) => c.id === id)?.label || "코디";

  const makePlan = (id: string) =>
    run(setPlans, id, () =>
      post<OutfitPlan>("/api/outfit-plan", {
        conceptId: id, custom: customOf(id), season: a!.season, colors: a!.bestColors,
      }),
    );

  const openConcept = (id: string) => {
    setConceptId(id);
    if (!plans[id] || plans[id].status === "error") makePlan(id);
  };

  const makeAiMakeup = (i: number) =>
    run(setAiMakeups, i, async () =>
      (await post<{ image: string }>("/api/makeup", { image: selfie, season: a!.season, look: a!.looks[i] })).image,
    );

  const makeAiOutfit = (id: string) =>
    run(setAiOutfits, id, async () =>
      (await post<{ image: string }>("/api/outfit", {
        image: base!.url, conceptId: id, custom: customOf(id), colors: a!.bestColors,
      })).image,
    );

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const drapeIsBest = !!drape && !!a?.bestColors.some((c) => safeHex(c.hex, "") === drape.hex);

  return (
    <main className={`app ${a?.tone || ""}`}>
      <header>
        <h1 className="logo">
          웜톤쿨톤
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M10 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7Z" />
            <path d="M19 14c.3 2.2 1.1 3 3.300 3.300-2.200.3-3 1.100-3.300 3.300-.3-2.200-1.100-3-3.300-3.300 2.200-.3 3-1.100 3.300-3.300Z" />
          </svg>
        </h1>
        {step !== "capture" && <button className="restart" onClick={reset}>처음부터</button>}
      </header>

      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={i === stepIdx ? "on" : i < stepIdx ? "done" : ""}>
            <button disabled={i >= stepIdx} onClick={() => setStep(s.id)}>
              <i>{i + 1}</i>
              <span>{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === "capture" && (
        <section>
          <h2 className="hero-title">
            셀카로 <em>퍼스널 컬러</em> 찾기
            <svg className="hero-heart" viewBox="0 0 32 32" aria-hidden>
              <path d="M16 27C7 20 4 15 5.500 10.500 7 6 12.500 6 15 11c1.500-5 8-6.500 10.500-2S24 20 16 27Zm0 0c3 1 6 1 9-.5" />
            </svg>
            <svg className="hero-line" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
              <path d="M3 8C70 3 190 2 297 6" />
            </svg>
          </h2>
          <p className="sub center">
            사진 한 장으로 <b>톤 진단</b>, 어울리는 <b>메이크업</b>, <b>코디</b>까지 보여드려요.
          </p>
          <Camera onCapture={onCapture} />
        </section>
      )}

      {step === "analysis" && analysis && (
        <section>
          {analysis.status === "loading" && (
            <div className="result loading">
              <img className="thumb" src={selfie} alt="내 셀카" />
              <div className="spinner" />
              <p>피부·눈동자·머리카락 색을 분석하고 있어요…</p>
            </div>
          )}
          {analysis.status === "error" && (
            <div className="result">
              <p className="error">{analysis.error}</p>
              <div className="row">
                <button className="btn ghost" onClick={reset}>다시 찍기</button>
                <button className="btn primary" onClick={() => analyze(selfie)}>다시 분석</button>
              </div>
            </div>
          )}
          {a && (
            <>
              <div className="verdict">
                <img className="thumb" src={selfie} alt="내 셀카" />
                <div>
                  <small>당신의 퍼스널 컬러는</small>
                  <strong>{SEASON_LABEL[a.season]}</strong>
                  <span className="badge">확신도 {a.confidence}%</span>
                </div>
              </div>
              <p className="summary">{a.summary}</p>
              {a.confidence < 50 && (
                <p className="note">사진 조명 때문에 결과가 정확하지 않을 수 있어요. 자연광에서 다시 찍어 보세요.</p>
              )}

              <div className="card">
                <h3>내 컬러 특징</h3>
                <dl>
                  <dt>피부</dt><dd>{a.features.skin}</dd>
                  <dt>눈동자</dt><dd>{a.features.eyes}</dd>
                  <dt>헤어</dt><dd>{a.features.hair}</dd>
                </dl>
              </div>

              <div className="card">
                <h3>잘 어울리는 색</h3>
                <Swatches colors={a.bestColors} />
                <h3>피하면 좋은 색</h3>
                <Swatches colors={a.avoidColors} />
              </div>

              <div className="card">
                <h3>추천 화장법</h3>
                <dl>
                  <dt>베이스</dt><dd>{a.makeup.base}</dd>
                  <dt>아이</dt><dd>{a.makeup.eyes}</dd>
                  <dt>블러셔</dt><dd>{a.makeup.blush}</dd>
                  <dt>립</dt><dd>{a.makeup.lips}</dd>
                </dl>
                <p className="note">💡 {a.makeup.tip}</p>
              </div>

              <button className="btn primary block" onClick={() => setStep("makeup")}>
                내 얼굴에 메이크업 해보기
              </button>
            </>
          )}
        </section>
      )}

      {step === "makeup" && a && look && (
        <section>
          <h2>메이크업 예시</h2>
          <div className="chips">
            {a.looks.map((l, i) => (
              <button key={i} className={`chip ${i === lookIdx ? "on" : ""}`} onClick={() => setLookIdx(i)}>
                {l.name}
              </button>
            ))}
          </div>
          <p className="summary">{look.description}</p>
          <div className="shades">
            {(["lip", "blush", "eye"] as const).map((k) => (
              <span key={k}>
                <i style={{ background: shadesOf(look)[k] }} />
                {{ lip: "립", blush: "블러셔", eye: "섀도" }[k]}
              </span>
            ))}
          </div>

          {face.status === "loading" && <Loading text="얼굴 위치를 찾고 있어요…" />}
          {face.status !== "loading" && !pts && (
            <p className="error">
              {face.error || "사진에서 얼굴을 찾지 못해 메이크업을 입힐 수 없어요. 정면 사진으로 다시 찍어 보세요."}
            </p>
          )}
          {selfieImg && pts && (
            <>
              <Painted
                label={original ? "원본 사진" : `${look.name} 메이크업을 입힌 사진`}
                render={() => (original ? selfieImg : madeUp())}
                deps={[selfieImg, pts, lookIdx, strength, original]}
              />
              <label className="slider">
                진하기
                <input
                  type="range" min="0.2" max="1" step="0.05" value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                />
              </label>
              <div className="row">
                <button className="btn ghost" onClick={() => setOriginal((v) => !v)}>
                  {original ? "메이크업 보기" : "원본 보기"}
                </button>
                <button className="btn ghost" onClick={() => saveImage(toJpeg(madeUp()), look.name)}>저장</button>
              </div>
              <button className="btn primary block" onClick={() => goOutfit(true)}>
                이 메이크업으로 코디 보기
              </button>
            </>
          )}
          <button className="link center" onClick={() => goOutfit(false)}>
            메이크업 없이 원본 사진으로 코디 보기
          </button>

          {AI_IMAGES && (
            <div className="card">
              <h3>AI 실사 버전</h3>
              {aiMakeups[lookIdx] ? (
                <AiResult gen={aiMakeups[lookIdx]} alt={`${look.name}_AI`} onRetry={() => makeAiMakeup(lookIdx)} />
              ) : (
                <button className="btn ghost block" onClick={() => makeAiMakeup(lookIdx)}>AI로 실사 메이크업 만들기</button>
              )}
            </div>
          )}
        </section>
      )}

      {step === "outfit" && a && base && (
        <section>
          <h2>코디</h2>
          <div className="tabs">
            <button className={mode === "drape" ? "on" : ""} onClick={() => setMode("drape")}>옷 색 대보기</button>
            <button className={mode === "concept" ? "on" : ""} onClick={() => setMode("concept")}>컨셉별 코디</button>
          </div>

          {mode === "drape" && !pts && (
            <p className="error">사진에서 얼굴을 찾지 못해 색을 대볼 수 없어요. 컨셉별 코디를 이용해 주세요.</p>
          )}
          {mode === "drape" && pts && drape && (
            <>
              <p className="sub">옷 색을 얼굴 아래에 대봤어요. 색을 눌러 얼굴빛이 어떻게 달라지는지 비교해 보세요.</p>
              <Painted
                label={`${drape.name} 색 옷을 얼굴 아래에 댄 사진`}
                render={() => renderDrape(base.el, pts, drape.hex)}
                deps={[base, pts, drape.hex]}
              />
              <p className="summary">
                <b>{drape.name}</b> · {drapeIsBest ? "잘 어울리는 색" : "피하면 좋은 색"}
              </p>
              <div className="card">
                <h3>잘 어울리는 색</h3>
                <Swatches colors={a.bestColors} active={drape.hex} onPick={setDrape} />
                <h3>피하면 좋은 색</h3>
                <Swatches colors={a.avoidColors} active={drape.hex} onPick={setDrape} />
              </div>
              <button
                className="btn ghost block"
                onClick={() => saveImage(toJpeg(renderDrape(base.el, pts, drape.hex)), drape.name)}
              >
                저장
              </button>
            </>
          )}

          {mode === "concept" && (
            <>
              <p className="sub">{SEASON_LABEL[a.season]}에 어울리는 색으로 컨셉별 코디를 짜 드려요.</p>
              <div className="concepts">
                {CONCEPTS.map((c) => (
                  <button
                    key={c.id}
                    className={`concept ${c.id === conceptId ? "on" : ""}`}
                    onClick={() => openConcept(c.id)}
                  >
                    <span>{c.emoji}</span>
                    {c.label}
                    {plans[c.id]?.status === "done" && <em>✓</em>}
                  </button>
                ))}
              </div>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = custom.trim();
                  if (t) openConcept(`custom:${t}`);
                }}
              >
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  maxLength={100}
                  placeholder="직접 입력 (예: 발레코어, 캠핑룩)"
                  aria-label="직접 입력 컨셉"
                />
                <button className="btn primary" disabled={!custom.trim()}>코디 짜기</button>
              </form>

              {plans[conceptId]?.status === "loading" && <Loading text="코디를 짜고 있어요…" />}
              {plans[conceptId]?.status === "error" && (
                <div className="result">
                  <p className="error">{plans[conceptId].error}</p>
                  <button className="btn ghost" onClick={() => makePlan(conceptId)}>다시 시도</button>
                </div>
              )}
              {plans[conceptId]?.value && (
                <>
                  <OutfitCard plan={plans[conceptId].value!} face={base.url} />
                  <button className="link center" onClick={() => makePlan(conceptId)}>다른 코디로 다시 짜기</button>
                </>
              )}

              {AI_IMAGES && conceptId && (
                <div className="card">
                  <h3>AI 실사 착장 사진</h3>
                  {aiOutfits[conceptId] ? (
                    <AiResult gen={aiOutfits[conceptId]} alt={`${labelOf(conceptId)}_AI`} onRetry={() => makeAiOutfit(conceptId)} />
                  ) : (
                    <button className="btn ghost block" onClick={() => makeAiOutfit(conceptId)}>AI로 옷 입은 사진 만들기</button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <footer>
        <div className="divider" aria-hidden>
          <svg viewBox="0 0 24 24"><path d="M12 20C5 14.500 3 11 4.500 7.500 6 4.500 10 4.500 12 8c2-3.500 6-3.500 7.500-.5S19 14.500 12 20Z" /></svg>
        </div>
        AI 진단은 참고용이에요.
        <br />
        메이크업·색 대보기는 휴대폰 안에서 처리되고, 사진은 서버에 저장되지 않아요.
      </footer>
    </main>
  );
}
