"use client";

import { BrainCircuit, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBullets, parseBullets } from "@/lib/bullets";

type ViewMode = "input" | "result";

type StructuredData = {
  chiefComplaint?: string;
  hpiSummary?: string;
  keyFindings?: string[];
  suspectedConditions?: string[];
  dispositionRecommendation?: string;
  uncertainties?: string;
  revisedHpi?: string;
};
type StructuredFieldKey =
  | "chiefComplaint"
  | "hpiSummary"
  | "keyFindings"
  | "suspectedConditions"
  | "dispositionRecommendation"
  | "uncertainties"
  | "revisedHpi";

type CaseResponse = {
  id?: string;
  original_note?: string;
  user_edited_data?: StructuredData;
  ai_generated_data?: StructuredData;
  field_source?: Partial<Record<StructuredFieldKey, "ai_generated" | "edited_by_user">>;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function normalizeStructuredData(data: StructuredData) {
  return {
    chiefComplaint: data.chiefComplaint ?? "",
    hpiSummary: data.hpiSummary ?? "",
    keyFindings: data.keyFindings ?? [],
    suspectedConditions: data.suspectedConditions ?? [],
    dispositionRecommendation: data.dispositionRecommendation ?? "",
    uncertainties: data.uncertainties ?? "",
    revisedHpi: data.revisedHpi ?? "",
  };
}

function hasStructuredContent(data?: StructuredData | null) {
  if (!data || typeof data !== "object") return false;
  return Object.values(normalizeStructuredData(data)).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return String(value).trim().length > 0;
  });
}

function Badge({ isAiGenerated }: { isAiGenerated: boolean }) {
  return (
    <div
      className={`ml-5 flex rounded-2xl p-1 ${
        isAiGenerated ? "bg-pink-200" : "bg-amber-100"
      }`}
    >
      <BrainCircuit size={20} color={isAiGenerated ? "#4c0519" : "#78350f"} />
      <div
        className={`ml-1 text-sm ${
          isAiGenerated ? "text-rose-950" : "text-amber-900"
        }`}
      >
        {isAiGenerated ? "AI Generated" : "Manually Edited by User"}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  isAiGenerated,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isAiGenerated: boolean;
}) {
  return (
    <div className="mt-3 text-gray-600">
      <div className="flex items-center">
        <p>{label}</p>
        <Badge isAiGenerated={isAiGenerated} />
      </div>
      <textarea
        className="mt-1 w-full rounded-2xl border-2 border-blue-400 p-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function OriginalClinicalNote({ originalNote }: { originalNote: string }) {
  return (
    <section className="m-4 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
      <h2 className="text-3xl font-semibold text-gray-900">Original Clinical Note</h2>
      <textarea
        className="mt-4 h-40 w-full rounded-2xl border-2 border-gray-300 bg-gray-100 p-3"
        disabled
        value={originalNote}
      />
    </section>
  );
}

function StructuredAnalysis({
  structuredDraft,
  onChange,
  onStartOver,
  onSave,
  isSaving,
  canSaveEdits,
  aiGeneratedDraft,
}: {
  structuredDraft: StructuredData;
  onChange: (next: StructuredData) => void;
  onStartOver: () => void;
  onSave: () => void;
  isSaving: boolean;
  canSaveEdits: boolean;
  aiGeneratedDraft: StructuredData | null;
}) {
  const isAiGeneratedField = (field: StructuredFieldKey) => {
    if (!aiGeneratedDraft) return false;
    const current = normalizeStructuredData(structuredDraft)[field];
    const aiValue = normalizeStructuredData(aiGeneratedDraft)[field];
    return JSON.stringify(current) === JSON.stringify(aiValue);
  };

  return (
    <section className="m-4 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
      <h2 className="text-3xl font-semibold text-gray-900">Structured Analysis</h2>

      <Field
        label="Chief Complaint"
        value={structuredDraft.chiefComplaint ?? ""}
        onChange={(value) => onChange({ ...structuredDraft, chiefComplaint: value })}
        isAiGenerated={isAiGeneratedField("chiefComplaint")}
      />

      <Field
        label="HPI Summary"
        value={structuredDraft.hpiSummary ?? ""}
        onChange={(value) => onChange({ ...structuredDraft, hpiSummary: value })}
        isAiGenerated={isAiGeneratedField("hpiSummary")}
      />

      <Field
        label="Key findings"
        value={formatBullets(structuredDraft.keyFindings ?? [])}
        onChange={(value) =>
          onChange({ ...structuredDraft, keyFindings: parseBullets(value) })
        }
        isAiGenerated={isAiGeneratedField("keyFindings")}
      />

      <Field
        label="Suspected Condition(s)"
        value={formatBullets(structuredDraft.suspectedConditions ?? [])}
        onChange={(value) =>
          onChange({ ...structuredDraft, suspectedConditions: parseBullets(value) })
        }
        isAiGenerated={isAiGeneratedField("suspectedConditions")}
      />

      <Field
        label="Disposition Recommendation (Admit / Observe / Discharge / Unknown)"
        value={structuredDraft.dispositionRecommendation ?? ""}
        onChange={(value) =>
          onChange({ ...structuredDraft, dispositionRecommendation: value })
        }
        isAiGenerated={isAiGeneratedField("dispositionRecommendation")}
      />

      <Field
        label="Uncertainties / Missing Information (if any)"
        value={structuredDraft.uncertainties ?? ""}
        onChange={(value) => onChange({ ...structuredDraft, uncertainties: value })}
        isAiGenerated={isAiGeneratedField("uncertainties")}
      />

      <Field
        label="Revised HPI (Admission-supporting narrative)"
        value={structuredDraft.revisedHpi ?? ""}
        onChange={(value) => onChange({ ...structuredDraft, revisedHpi: value })}
        isAiGenerated={isAiGeneratedField("revisedHpi")}
      />

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-xl bg-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-300 cursor-pointer"
        >
          Start Over
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !canSaveEdits}
          className={`rounded-xl px-6 py-3 text-base font-semibold text-white transition-colors ${
            isSaving || !canSaveEdits
              ? "cursor-not-allowed bg-gray-300"
              : "cursor-pointer bg-green-600 hover:bg-green-700"
          }`}
        >
          {isSaving ? "Saving..." : "Save Edits"}
        </button>
      </div>
    </section>
  );
}

export default function NewCaseView() {
  const [viewMode, setViewMode] = useState<ViewMode>("input");
  const [note, setNote] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [originalNote, setOriginalNote] = useState("");
  const [structuredDraft, setStructuredDraft] = useState<StructuredData>({});
  const [aiGeneratedDraft, setAiGeneratedDraft] = useState<StructuredData | null>(null);
  const [lastSavedDraft, setLastSavedDraft] = useState<StructuredData | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasNote = note.trim().length > 0;
  const hasUnsavedEdits = useMemo(() => {
    if (!lastSavedDraft) return false;

    return (
      JSON.stringify(normalizeStructuredData(structuredDraft)) !==
      JSON.stringify(normalizeStructuredData(lastSavedDraft))
    );
  }, [structuredDraft, lastSavedDraft]);

  const loadExample = () => {
    setNote(
      "72-year-old female with 3 days of fever, right lower quadrant abdominal pain, leukocytosis, CT concerning acute diverticulitis. Failed outpatient antibiotics."
    );
  };

  const handleGenerate = async () => {
    if (!hasNote) return;

    setGenerateError(null);
    setSaveError(null);
    setSaveMessage(null);
    setIsGenerating(true);

    try {
      const createRes = await fetch(`${apiBaseUrl}/api/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_note: note.trim() }),
      });

      if (!createRes.ok) {
        throw new Error("Create case failed.");
      }

      const created = (await createRes.json()) as CaseResponse;
      if (!created.id) {
        throw new Error("Create case response missing id.");
      }
      setCaseId(created.id);

      const generateRes = await fetch(`${apiBaseUrl}/api/cases/${created.id}/generate`, {
        method: "POST",
      });

      if (!generateRes.ok) {
        let message = `Generate failed (HTTP ${generateRes.status})`;
        try {
          const body = (await generateRes.json()) as { error?: string; code?: string | number };
          if (body.error || body.code) {
            const codeText = body.code ? ` [code: ${body.code}]` : "";
            message = `${body.error ?? "Generate failed"}${codeText} (HTTP ${generateRes.status})`;
          }
        } catch {

        }
        throw new Error(message);
      }

      const finalized = (await generateRes.json()) as CaseResponse;
      const nextStructured = hasStructuredContent(finalized.user_edited_data)
        ? finalized.user_edited_data ?? {}
        : finalized.ai_generated_data ?? {};
      const aiStructured = finalized.ai_generated_data ?? nextStructured;

      setOriginalNote(finalized.original_note ?? note.trim());
      setStructuredDraft(nextStructured);
      setAiGeneratedDraft(aiStructured);
      setLastSavedDraft(nextStructured);
      setViewMode("result");
    } catch (e) {
      setGenerateError(
        e instanceof Error ? e.message : "There was an error generating an analysis."
      );
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCase = async () => {
    if (!caseId) {
      setSaveError("No case found to save.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_edited_data: structuredDraft }),
      });

      if (!response.ok) {
        throw new Error("Save case failed.");
      }

      const updated = (await response.json()) as CaseResponse;
      setSaveMessage("Case saved.");
      setLastSavedDraft(updated.user_edited_data ?? structuredDraft);
    } catch (e) {
      setSaveError("There was an error saving this case.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (viewMode === "result") {
    return (
      <>
        <OriginalClinicalNote originalNote={originalNote} />
        <StructuredAnalysis
          structuredDraft={structuredDraft}
          onChange={(next) => {
            setStructuredDraft(next);
            setSaveMessage(null);
            setSaveError(null);
          }}
          onSave={handleSaveCase}
          isSaving={isSaving}
          canSaveEdits={hasUnsavedEdits}
          aiGeneratedDraft={aiGeneratedDraft}
          onStartOver={() => {
            setViewMode("input");
            setCaseId(null);
            setStructuredDraft({});
            setAiGeneratedDraft(null);
            setLastSavedDraft(null);
            setGenerateError(null);
            setSaveError(null);
            setSaveMessage(null);
          }}
        />
        {saveMessage ? (
          <p className="mx-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {saveMessage}
          </p>
        ) : null}
        {saveError ? (
          <p className="mx-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {saveError}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section className="m-4 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
      <h2 className="text-3xl font-semibold text-gray-900">Enter Clinical Note</h2>

      <div className="mt-4 space-y-2">
        <label htmlFor="clinical-note" className="block text-sm font-medium text-gray-700">
          Clinical Note
        </label>
        <textarea
          id="clinical-note"
          placeholder="Paste unstructured clinical note here..."
          className="h-40 w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!hasNote || isGenerating}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white ${
            hasNote && !isGenerating
              ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          <Sparkles className="h-5 w-5" />
          {isGenerating ? "Generating..." : "Generate Analysis"}
        </button>
        <button
          type="button"
          className="rounded-xl bg-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-300 cursor-pointer"
          onClick={loadExample}
        >
          Load Example
        </button>
      </div>

      {generateError ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {generateError}
        </p>
      ) : null}
    </section>
  );
}
