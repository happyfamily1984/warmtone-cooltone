"use client";

import { useState } from "react";
import Camera from "@/components/Camera";
import { saveImage } from "@/lib/save";
import { CONCEPTS, SEASON_LABEL, type Analysis, type Swatch } from "@/lib/types";

type Step = "capture" | "analysis" | "makeup" | "outfit";
type Gen = { status: "loading" | "done" | "error"; image?: string; error?: string };

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

function Swatches({ colors }: { colors: Swatch[] }) {
  return (
    <div className="swatches">
      {colors.map((c, i) => (
        <div key={i} className="swatch">
          <span style={{ background: c.hex }} />
          <small>{c.name}</small>
        </div>
      ))}
    </div>
  );
}

function Result({ gen, alt, onRetry }: { gen: Gen; alt: string; onRetry: () => void }) {
  if (gen.status === "loading")
    return (
      <div className="result loading">
        <div className="spinner" />
        <p>만드는 중… 10~30초 걸려요</p>
      </div>
    );
  if (gen.status === "error")
    return (
      <div className="result">
        <p className="error">{gen.error}</p>
        <button className="btn ghost" onClick={onRetry}>다시 시도</button>
      </div>
    );
  return (
    <div className="result">
      <img src={gen.image} alt={alt} />
      <div className="row">
        <button className="btn ghost" onClick={onRetry}>다시 만들기</button>
        <button className="btn ghost" onClick={() => saveImage(gen.image!, alt)}>저장</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("capture");
  const [selfie, setSelfie] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const [makeups, setMakeups] = useState<Record<number, Gen>>({});
  const [lookIdx, setLookIdx] = useState(0);
  const [base, setBase] = useState(""); // 코디에 사용할 화장한 사진

  const [outfits, setOutfits] = useState<Record<string, Gen>>({});
  const [conceptId, setConceptId] = useState("");
  const [custom, setCustom] = useState("");

  const reset = () => {
    setStep("capture");
    setSelfie("");
    setAnalysis(null);
    setError("");
    setMakeups({});
    setLookIdx(0);
    setBase("");
    setOutfits({});
    setConceptId("");
  };

  const analyze = async (image: string) => {
    setSelfie(image);
    setError("");
    setAnalyzing(true);
    setStep("analysis");
    try {
      setAnalysis(await post<Analysis>("/api/analyze", { image }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const makeMakeup = async (i: number) => {
    if (!analysis) return;
    setLookIdx(i);
    setMakeups((m) => ({ ...m, [i]: { status: "loading" } }));
    try {
      const { image } = await post<{ image: string }>("/api/makeup", {
        image: selfie,
        season: analysis.season,
        look: analysis.looks[i],
      });
      setMakeups((m) => ({ ...m, [i]: { status: "done", image } }));
    } catch (e) {
      setMakeups((m) => ({ ...m, [i]: { status: "error", error: (e as Error).message } }));
    }
  };

  const openLook = (i: number) => {
    setLookIdx(i);
    if (!makeups[i]) makeMakeup(i);
  };

  const makeOutfit = async (id: string, text = "") => {
    if (!analysis || !base) return;
    setConceptId(id);
    setOutfits((o) => ({ ...o, [id]: { status: "loading" } }));
    try {
      const { image } = await post<{ image: string }>("/api/outfit", {
        image: base,
        conceptId: id,
        custom: text,
        colors: analysis.bestColors,
      });
      setOutfits((o) => ({ ...o, [id]: { status: "done", image } }));
    } catch (e) {
      setOutfits((o) => ({ ...o, [id]: { status: "error", error: (e as Error).message } }));
    }
  };

  const openConcept = (id: string) => {
    setConceptId(id);
    if (!outfits[id]) makeOutfit(id);
  };

  const goOutfit = (image: string) => {
    if (image !== base) {
      setBase(image);
      setOutfits({});
      setConceptId("");
    }
    setStep("outfit");
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const tone = analysis?.tone;
  const curMakeup = makeups[lookIdx];
  const curOutfit = conceptId ? outfits[conceptId] : undefined;
  const customLabel = conceptId.startsWith("custom:") ? conceptId.slice(7) : "";

  return (
    <main className={`app ${tone || ""}`}>
      <header>
        <h1>
          <span className="warm-t">웜톤</span>
          <span className="cool-t">쿨톤</span>
        </h1>
        {step !== "capture" && (
          <button className="link" onClick={reset}>처음부터</button>
        )}
      </header>

      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={i === stepIdx ? "on" : i < stepIdx ? "done" : ""}>
            <button disabled={i >= stepIdx} onClick={() => setStep(s.id)}>
              <i>{i + 1}</i>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {step === "capture" && (
        <section>
          <h2>셀카로 퍼스널 컬러 찾기</h2>
          <p className="sub">사진 한 장으로 톤 진단, 어울리는 메이크업, 코디까지 보여드려요.</p>
          <Camera onCapture={analyze} />
        </section>
      )}

      {step === "analysis" && (
        <section>
          {analyzing && (
            <div className="result loading">
              <img className="thumb" src={selfie} alt="내 셀카" />
              <div className="spinner" />
              <p>피부·눈동자·머리카락 색을 분석하고 있어요…</p>
            </div>
          )}
          {error && !analyzing && (
            <div className="result">
              <p className="error">{error}</p>
              <div className="row">
                <button className="btn ghost" onClick={reset}>다시 찍기</button>
                <button className="btn primary" onClick={() => analyze(selfie)}>다시 분석</button>
              </div>
            </div>
          )}
          {analysis && !analyzing && (
            <>
              <div className="verdict">
                <img className="thumb" src={selfie} alt="내 셀카" />
                <div>
                  <small>당신의 퍼스널 컬러는</small>
                  <strong>{SEASON_LABEL[analysis.season]}</strong>
                  <span className="badge">확신도 {analysis.confidence}%</span>
                </div>
              </div>
              <p className="summary">{analysis.summary}</p>
              {analysis.confidence < 50 && (
                <p className="note">사진 조명 때문에 결과가 정확하지 않을 수 있어요. 자연광에서 다시 찍어 보세요.</p>
              )}

              <div className="card">
                <h3>내 컬러 특징</h3>
                <dl>
                  <dt>피부</dt><dd>{analysis.features.skin}</dd>
                  <dt>눈동자</dt><dd>{analysis.features.eyes}</dd>
                  <dt>헤어</dt><dd>{analysis.features.hair}</dd>
                </dl>
              </div>

              <div className="card">
                <h3>잘 어울리는 색</h3>
                <Swatches colors={analysis.bestColors} />
                <h3>피하면 좋은 색</h3>
                <Swatches colors={analysis.avoidColors} />
              </div>

              <div className="card">
                <h3>추천 화장법</h3>
                <dl>
                  <dt>베이스</dt><dd>{analysis.makeup.base}</dd>
                  <dt>아이</dt><dd>{analysis.makeup.eyes}</dd>
                  <dt>블러셔</dt><dd>{analysis.makeup.blush}</dd>
                  <dt>립</dt><dd>{analysis.makeup.lips}</dd>
                </dl>
                <p className="note">💡 {analysis.makeup.tip}</p>
              </div>

              <button className="btn primary block" onClick={() => { setStep("makeup"); openLook(lookIdx); }}>
                내 얼굴에 메이크업 해보기
              </button>
            </>
          )}
        </section>
      )}

      {step === "makeup" && analysis && (
        <section>
          <h2>메이크업 예시</h2>
          <p className="sub">룩을 고르면 내 사진에 화장한 모습을 만들어 드려요.</p>
          <div className="chips">
            {analysis.looks.map((l, i) => (
              <button key={i} className={`chip ${i === lookIdx ? "on" : ""}`} onClick={() => openLook(i)}>
                {l.name}
                {makeups[i]?.status === "done" && " ✓"}
              </button>
            ))}
          </div>
          <p className="summary">{analysis.looks[lookIdx]?.description}</p>

          {curMakeup && (
            <Result gen={curMakeup} alt={analysis.looks[lookIdx].name} onRetry={() => makeMakeup(lookIdx)} />
          )}

          {curMakeup?.status === "done" && (
            <button className="btn primary block" onClick={() => goOutfit(curMakeup.image!)}>
              이 메이크업으로 옷 입어보기
            </button>
          )}
          <button className="link center" onClick={() => goOutfit(selfie)}>
            메이크업 없이 원본 사진으로 코디 보기
          </button>
        </section>
      )}

      {step === "outfit" && analysis && (
        <section>
          <h2>컨셉별 코디</h2>
          <div className="verdict small">
            <img className="thumb" src={base} alt="코디에 사용할 사진" />
            <p className="sub">
              {SEASON_LABEL[analysis.season]}에 어울리는 색으로 옷을 입혀 드려요. 컨셉을 골라 보세요.
            </p>
          </div>
          <div className="concepts">
            {CONCEPTS.map((c) => (
              <button
                key={c.id}
                className={`concept ${c.id === conceptId ? "on" : ""}`}
                onClick={() => openConcept(c.id)}
              >
                <span>{c.emoji}</span>
                {c.label}
                {outfits[c.id]?.status === "done" && <em>✓</em>}
              </button>
            ))}
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const t = custom.trim();
              if (t) makeOutfit(`custom:${t}`, t);
            }}
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={100}
              placeholder="직접 입력 (예: 발레코어, 캠핑룩)"
              aria-label="직접 입력 컨셉"
            />
            <button className="btn primary" disabled={!custom.trim()}>입히기</button>
          </form>

          {curOutfit && (
            <Result
              gen={curOutfit}
              alt={customLabel || CONCEPTS.find((c) => c.id === conceptId)?.label || "코디"}
              onRetry={() => makeOutfit(conceptId, customLabel)}
            />
          )}
        </section>
      )}

      <footer>
        AI가 만든 진단·이미지는 참고용이에요. 사진은 분석에만 쓰이고 서버에 저장되지 않아요.
      </footer>
    </main>
  );
}
