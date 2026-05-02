"use client";

import { BrainCircuit, Sparkles, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBullets, parseBullets } from "@/lib/bullets";

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
};

type UploadCaseViewProps = {
  onCaseCreated?: () => void;
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

function StructuredResult({
  originalNote,
  structuredDraft,
  aiGeneratedDraft,
  onChange,
  onSave,
  isSaving,
  canSaveEdits,
}: {
  originalNote: string;
  structuredDraft: StructuredData;
  aiGeneratedDraft: StructuredData | null;
  onChange: (next: StructuredData) => void;
  onSave: () => void;
  isSaving: boolean;
  canSaveEdits: boolean;
}) {
  const isAiGeneratedField = (field: StructuredFieldKey) => {
    if (!aiGeneratedDraft) return false;
    const current = normalizeStructuredData(structuredDraft)[field];
    const generated = normalizeStructuredData(aiGeneratedDraft)[field];
    return JSON.stringify(current) === JSON.stringify(generated);
  };

  return (
    <>
      <section className="m-4 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
        <h2 className="text-3xl font-semibold text-gray-900">Original Clinical Note</h2>
        <textarea
          className="mt-4 h-40 w-full rounded-2xl border-2 border-gray-300 bg-gray-100 p-3"
          disabled
          value={originalNote}
        />
      </section>
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
        <div className="mt-6 flex justify-end">
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
    </>
  );
}

export default function UploadCaseView({ onCaseCreated }: UploadCaseViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [originalNote, setOriginalNote] = useState("");
  const [structuredDraft, setStructuredDraft] = useState<StructuredData>({});
  const [aiGeneratedDraft, setAiGeneratedDraft] = useState<StructuredData | null>(null);
  const [lastSavedDraft, setLastSavedDraft] = useState<StructuredData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isSupported = useMemo(() => {
    if (!file) return false;
    const lower = file.name.toLowerCase();
    return lower.endsWith(".pdf") || lower.endsWith(".docx");
  }, [file]);

  const hasUnsavedEdits = useMemo(() => {
    if (!lastSavedDraft) return false;
    return (
      JSON.stringify(normalizeStructuredData(structuredDraft)) !==
      JSON.stringify(normalizeStructuredData(lastSavedDraft))
    );
  }, [structuredDraft, lastSavedDraft]);

  const handleUploadAndGenerate = async () => {
    if (!file || !isSupported) return;

    setUploadError(null);
    setSaveError(null);
    setSaveMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("document", file);

      const response = await fetch(`${apiBaseUrl}/api/cases/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = `Upload failed (HTTP ${response.status})`;
        try {
          const body = (await response.json()) as { error?: string; code?: string | number };
          if (body.error || body.code) {
            const codeText = body.code ? ` [code: ${body.code}]` : "";
            message = `${body.error ?? "Upload failed"}${codeText} (HTTP ${response.status})`;
          }
        } catch {

        }
        throw new Error(message);
      }

      const finalized = (await response.json()) as CaseResponse;
      const nextStructured = hasStructuredContent(finalized.user_edited_data)
        ? finalized.user_edited_data ?? {}
        : finalized.ai_generated_data ?? {};

      setCaseId(finalized.id ?? null);
      setOriginalNote(finalized.original_note ?? "");
      setStructuredDraft(nextStructured);
      setAiGeneratedDraft(finalized.ai_generated_data ?? nextStructured);
      setLastSavedDraft(nextStructured);
      onCaseCreated?.();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "There was an error processing document."
      );
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!caseId) return;
    setSaveError(null);
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_edited_data: structuredDraft }),
      });
      if (!response.ok) throw new Error("Save failed.");

      const updated = (await response.json()) as CaseResponse;
      const saved = updated.user_edited_data ?? structuredDraft;
      setLastSavedDraft(saved);
      setStructuredDraft(saved);
      setSaveMessage("Edits saved.");
    } catch (error) {
      setSaveError("There was an error saving this case.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (caseId) {
    return (
      <>
        <StructuredResult
          originalNote={originalNote}
          structuredDraft={structuredDraft}
          aiGeneratedDraft={aiGeneratedDraft}
          onChange={(next) => {
            setStructuredDraft(next);
            setSaveError(null);
            setSaveMessage(null);
          }}
          onSave={handleSaveEdits}
          isSaving={isSaving}
          canSaveEdits={hasUnsavedEdits}
        />
        {saveMessage ? (
          <p className="mx-4 mb-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
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
      <h2 className="text-3xl font-semibold text-gray-900">Upload Clinical Document</h2>
      <p className="mt-2 text-sm text-gray-600">
        Upload a PDF or Word (.docx) document to parse and generate analysis automatically.
      </p>

      <label
        htmlFor="case-document"
        className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-white px-6 py-10 text-center"
      >
        <Upload className="h-8 w-8 text-blue-600" />
        <p className="mt-3 text-sm font-semibold text-gray-800">
          Click to choose a PDF or DOCX
        </p>
        <p className="mt-1 text-xs text-gray-500">Max recommended size: 10MB</p>
        <input
          id="case-document"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setUploadError(null);
          }}
        />
      </label>

      {file ? (
        <p className="mt-3 text-sm text-gray-700">
          Selected file: <span className="font-semibold">{file.name}</span>
        </p>
      ) : null}

      {!isSupported && file ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Unsupported file type. Please upload a PDF or DOCX file.
        </p>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          onClick={handleUploadAndGenerate}
          disabled={!file || !isSupported || isUploading}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white ${
            file && isSupported && !isUploading
              ? "bg-blue-600 hover:bg-blue-700"
              : "cursor-not-allowed bg-gray-300"
          }`}
        >
          <Sparkles className="h-5 w-5" />
          {isUploading ? "Processing..." : "Upload & Generate"}
        </button>
      </div>

      {uploadError ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {uploadError}
        </p>
      ) : null}
    </section>
  );
}
