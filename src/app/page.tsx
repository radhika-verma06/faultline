"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { Footer, Masthead } from "@/components/Masthead";
import { Report } from "@/components/Report";
import { BeliefRail, QuestionCard, StartScreen, type ReadNote } from "@/components/Session";
import { Button, Field, Rule, Shell } from "@/components/ui";
import {
  intelligence,
  isLive,
  memory,
  notifyLayerConfigChanged,
  subscribeToLayerConfig,
} from "@/lib/ai";
import { DEFAULT_ENDPOINT, ENDPOINT_STORAGE, KEY_STORAGE } from "@/lib/ai/evorozen";
import { buildLocally } from "@/lib/ai/offline";
import type { FaultProfile, RemediationDraft } from "@/lib/ai/types";
import { MISCONCEPTIONS, misconception } from "@/lib/domain/misconceptions";
import {
  MAX_ITEMS,
  answer as recordAnswer,
  diagnose,
  nextItem,
  startSession,
  type Confidence,
  type Session,
} from "@/lib/engine/session";

type Stage = "start" | "asking" | "report";

/** Stable per-device key for a name, so a returning student gets their map back. */
function slug(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : "guest";
}

export default function Page() {
  const [stage, setStage] = useState<Stage>("start");
  const [session, setSession] = useState<Session>(() => startSession());
  const [name, setName] = useState("");
  const [learnerId, setLearnerId] = useState("guest");

  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence>(2);
  const [reasoning, setReasoning] = useState("");
  const [busy, setBusy] = useState(false);
  const [readNote, setReadNote] = useState<ReadNote | null>(null);

  const [draft, setDraft] = useState<RemediationDraft | null>(null);
  const [prior, setPrior] = useState<FaultProfile | null>(null);

  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [endpointDraft, setEndpointDraft] = useState("");

  // Read from the browser rather than copied into state: the server snapshot is
  // always "not connected", which is also what the deployed build ships with.
  const live = useSyncExternalStore(subscribeToLayerConfig, isLive, () => false);
  const layerName = live ? "Neural Pulse" : "this device only";

  // Both of these recompute only when the session changes, never on a keystroke.
  const report = useMemo(() => diagnose(session), [session]);
  const current = useMemo(() => nextItem(session), [session]);

  const begin = async () => {
    const id = slug(name);
    setLearnerId(id);
    try {
      setPrior(await memory().loadProfile(id));
    } catch {
      setPrior(null);
    }
    setStage("asking");
  };

  const submit = async () => {
    if (current === null || selected === null || busy) return;
    setBusy(true);

    const chosen = current.options.find((option) => option.key === selected);
    let reasoningEvidence: Record<string, number> | undefined;

    if (reasoning.trim().length > 0) {
      try {
        const read = await intelligence().readReasoning({
          reasoning: reasoning.trim(),
          itemStem: current.stem,
          chosenOption: chosen?.text ?? "",
          beliefs: report.beliefs,
        });

        if (Object.keys(read.evidence).length > 0) {
          reasoningEvidence = read.evidence;
          const strongest = Object.entries(read.evidence).sort(
            (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
          )[0];
          setReadNote({
            source: read.source,
            because: read.because,
            moved:
              strongest === undefined
                ? "no fault line moved"
                : `${misconception(strongest[0]).name} ${strongest[1] > 0 ? "+" : ""}${strongest[1].toFixed(1)}`,
          });
        }
      } catch {
        // A failed read never costs the student their answer.
      }
    }

    const advanced = recordAnswer(session, {
      itemId: current.id,
      optionKey: selected,
      confidence,
      reasoning: reasoning.trim().length > 0 ? reasoning.trim() : undefined,
      reasoningEvidence,
    });

    setSession(advanced);
    setSelected(null);
    setConfidence(2);
    setReasoning("");
    setBusy(false);

    if (nextItem(advanced) === null) await finish(advanced);
  };

  const finish = async (finished: Session) => {
    const finalReport = diagnose(finished);
    const primary = finalReport.primary;

    let built: RemediationDraft | null = null;
    if (primary !== null) {
      const input = {
        faultId: primary.id,
        beliefs: finalReport.beliefs,
        answered: finalReport.answered,
        reasoning: finished.responses.find((response) => response.reasoning)?.reasoning,
      };
      try {
        built = await intelligence().writeRemediation(input);
      } catch {
        built = buildLocally(input);
      }
    }

    setDraft(built);
    setStage("report");

    try {
      const store = memory();
      await store.saveProfile({
        studentId: learnerId,
        studentLabel: name.trim().length > 0 ? name.trim() : "guest",
        beliefs: { ...finalReport.beliefs },
        answered: finalReport.answered,
        primary: primary?.id ?? null,
        updatedAt: new Date().toISOString(),
      });
      await store.saveSession({
        studentId: learnerId,
        asked: finalReport.asked,
        correct: finalReport.correct,
        primary: primary?.id ?? null,
        finishedAt: new Date().toISOString(),
      });
    } catch {
      // The diagnosis stands even if nothing could be stored.
    }
  };

  const restart = () => {
    setSession(startSession());
    setDraft(null);
    setPrior(null);
    setSelected(null);
    setReasoning("");
    setReadNote(null);
    setStage("start");
  };

  const saveKey = () => {
    try {
      if (keyDraft.trim().length > 0) window.localStorage.setItem(KEY_STORAGE, keyDraft.trim());
      else window.localStorage.removeItem(KEY_STORAGE);
      if (endpointDraft.trim().length > 0) {
        window.localStorage.setItem(ENDPOINT_STORAGE, endpointDraft.trim());
      } else {
        window.localStorage.removeItem(ENDPOINT_STORAGE);
      }
    } catch {
      // A blocked store simply means no key is remembered.
    }
    setKeyDraft("");
    setEndpointDraft("");
    setShowKey(false);
    notifyLayerConfigChanged();
  };

  const priorConfirmed =
    prior === null
      ? 0
      : Object.values(prior.beliefs).filter((belief) => belief >= 0.82).length;

  return (
    <>
      <Masthead layerName={layerName} live={live}>
        <Button variant="quiet" onClick={() => setShowKey((open) => !open)}>
          {showKey ? "Close" : live ? "Neural Pulse connected" : "Connect Neural Pulse"}
        </Button>
      </Masthead>

      {showKey && (
        <div className="border-b-2 border-rule bg-raised/80">
          <div className="mx-auto w-full max-w-5xl px-6 py-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-end">
              <div className="flex-1">
                <Field
                  id="neural-key"
                  label="Evorozen Neural Pulse key"
                  value={keyDraft}
                  onChange={setKeyDraft}
                  placeholder="evo_live_…"
                  hint="Kept in this browser and sent only to the endpoint below. Never placed in the built page."
                />
              </div>
              <div className="flex-1">
                <Field
                  id="neural-endpoint"
                  label="Endpoint"
                  value={endpointDraft}
                  onChange={setEndpointDraft}
                  placeholder={DEFAULT_ENDPOINT}
                  hint="Leave blank to use the default."
                />
              </div>
              <div className="pb-1">
                <Button onClick={saveKey}>Apply</Button>
              </div>
            </div>
            <Rule className="mt-5" />
            <p className="mt-3 max-w-3xl text-[0.8125rem] leading-relaxed text-ink-faint">
              {live
                ? "Connected. Reasoning is read by the Neural Pulse engine, the authored lesson is rewritten in the student's own words, and fault profiles persist in the virtual database rather than this browser. Every call is wrapped: a timeout or a bad response degrades one answer to the built-in reader instead of ending the session."
                : "Not connected. Faultline is fully functional without a key: reasoning is read by the built-in phrase reader, lessons come from the authored bank, and profiles are kept in this browser. Nothing is uploaded."}
            </p>
          </div>
        </div>
      )}

      <Shell>
        {stage === "start" && (
          <StartScreen
            name={name}
            onName={setName}
            onBegin={begin}
            faultNames={MISCONCEPTIONS.map((entry) => entry.name)}
            priorConfirmed={priorConfirmed}
            live={live}
          />
        )}

        {stage === "asking" && current !== null && (
          <div className="grid gap-14 pt-12 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
            <QuestionCard
              item={current}
              index={session.responses.length + 1}
              budget={MAX_ITEMS}
              selected={selected}
              onSelect={setSelected}
              confidence={confidence}
              onConfidence={setConfidence}
              reasoning={reasoning}
              onReasoning={setReasoning}
              onSubmit={submit}
              busy={busy}
              readNote={readNote}
            />
            <BeliefRail
              readings={report.faults}
              probed={report.probed}
              total={report.total}
              source={layerName}
            />
          </div>
        )}

        {stage === "asking" && current === null && (
          <div className="flex flex-col items-center gap-4 pt-24">
            <span className="label text-belief">Reading the answers…</span>
            <div aria-hidden="true" className="h-1.5 w-48 overflow-hidden rounded-full bg-sunk">
              <div className="animate-rise h-full w-1/2 rounded-full bg-belief" />
            </div>
          </div>
        )}

        {stage === "report" && (
          <Report
            diagnosis={report}
            draft={draft}
            prior={prior}
            onRestart={restart}
            onEditKey={() => {
              setShowKey(true);
              window.scrollTo({ top: 0 });
            }}
          />
        )}

        <Footer />
      </Shell>
    </>
  );
}
