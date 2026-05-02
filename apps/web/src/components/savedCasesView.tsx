import { ArrowLeft, BrainCircuit, Calendar, CircleAlert, Copy, Eye, Trash2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
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

type FieldSource = Partial<Record<StructuredFieldKey, "ai_generated" | "edited_by_user">>;

type Cases = {
  id: string;
  original_note: string;
  created_at: string;
  ai_generated_data: StructuredData | null;
  user_edited_data: StructuredData | null;
  field_source?: FieldSource | null;
}

function hasStructuredContent(data?: StructuredData | null) {
  if (!data || typeof data !== "object") return false;
  return Object.values(data).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
  });
}

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

function formatCaseDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type ViewType = "allCases" | "specificCase";

export function SavedCasesView({
  onCasesLoaded,
}: {
  onCasesLoaded?: (cases: Cases[]) => void;
}) {

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

  const [fetchError, setFetchError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [caseData, setCaseData] = useState<Cases[]>([]);
  const [deletingCaseIds, setDeletingCaseIds] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<ViewType>("allCases");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const handleDeleteCase = async (id: string) => {
    if (deletingCaseIds.has(id)) return;

    setDeletingCaseIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const response = await fetch(`${apiBaseUrl}/api/cases/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 404) {
        throw new Error("Error deleting case.");
      }

      setCaseData((prev) => prev.filter((item) => item.id !== id));

      if (selectedCaseId === id) {
        setSelectedCaseId(null);
        setViewType("allCases");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingCaseIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/cases`);
  
        if (!response.ok) {
          throw new Error("Error fetching cases.")
        }
        
        const data =(await response.json()) as Cases[];
        setCaseData(data);
  
      } catch (e) {
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCases();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (isLoading) return;
    onCasesLoaded?.(caseData);
  }, [caseData, isLoading, onCasesLoaded]);

  if (isLoading) {
    return <LoadingView />;
  }
  
  return viewType == "allCases" ? (
    caseData.length > 0 ? (
      <HasCasesView
        cases={caseData}
        deletingCaseIds={deletingCaseIds}
        onDeleteCase={handleDeleteCase}
        onViewCase={(id) => {
          setSelectedCaseId(id);
          setViewType("specificCase");
        }}
      />
    ) : (
      <NoCasesView fetchError={fetchError} />
    )
  ) : viewType == "specificCase" ? (
    <SpecificCaseInfoView
      caseId={selectedCaseId ?? ""}
      onBack={() => {
        setViewType("allCases");
        setSelectedCaseId(null);
      }}
    />
  ) : null
}

const LoadingView = () => {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-14 shadow-sm">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="mt-4 text-lg font-medium text-gray-700">Loading saved cases...</p>
      </div>
    </section>
  );
};

const NoCasesView = ({ fetchError }: { fetchError: boolean }) => {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-14 shadow-sm">
      <div className="flex flex-col items-center justify-center text-center">
        <CircleAlert className="h-14 w-14 text-gray-300" />
        <h2 className="mt-6 text-4xl font-semibold text-gray-900">No Cases Yet</h2>
        <p className="mt-3 text-xl text-gray-600">
          Create your first case by entering a clinical note in the "New Case"
          tab.
        </p>

        {fetchError && <p className="text-red-500 text-xl mt-5">Error fetching cases.</p>}
      </div>
    </section>
  );
}

const HasCasesView = ({
  cases,
  deletingCaseIds,
  onViewCase,
  onDeleteCase,
}: {
  cases: Cases[];
  deletingCaseIds: Set<string>;
  onViewCase: (id: string) => void;
  onDeleteCase: (id: string) => void;
}) => {
  return (
    <div>
      {cases.map((item) => {
        const source = hasStructuredContent(item.user_edited_data)
          ? item.user_edited_data
          : item.ai_generated_data;
        return (
          <CaseView
            key={item.id}
            caseId={item.id}
            chiefComplaint={source?.chiefComplaint ?? "Unknown complaint"}
            date={item.created_at}
            suspectedCondition={source?.suspectedConditions?.[0] ?? "Unknown"}
            hpiSummary={source?.hpiSummary ?? "No summary available"}
            onViewCase={onViewCase}
            onDeleteCase={onDeleteCase}
            isDeleting={deletingCaseIds.has(item.id)}
          />
        );
      })}
    </div>
  );
};

const CaseView = ({
  caseId,
  chiefComplaint,
  date,
  suspectedCondition,
  hpiSummary,
  onViewCase,
  onDeleteCase,
  isDeleting,
} : {
  caseId: string;
  chiefComplaint: string;
  date: string;
  suspectedCondition: string;
  hpiSummary: string;
  onViewCase: (id: string) => void;
  onDeleteCase: (id: string) => void;
  isDeleting: boolean;
}) => {
  const formattedDate = formatCaseDate(date);
  const viewCase = () => onViewCase(caseId);
  const deleteCase = () => onDeleteCase(caseId);

  return (
    <div className="mb-3 w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 shadow-sm">
      <div className="flex justify-between gap-3">
        <h3 className="text-2xl font-semibold text-gray-900">{chiefComplaint}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={deleteCase}
            disabled={isDeleting}
            className={`inline-flex items-center rounded-xl p-2 text-red-700 transition-colors cursor-pointer ${
              isDeleting
                ? "cursor-not-allowed bg-red-50 opacity-60"
                : "cursor-pointer bg-red-100 hover:bg-red-200"
            }`}
            aria-label="Delete case"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={viewCase}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer"
          >
            <Eye size={16} />
            View
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
        <Calendar size={16} color="#969BA5" />
        <span>{formattedDate}</span>
      </div>

      <p className="mt-4 text-sm text-gray-700">
        <span className="font-semibold">Suspected Condition:</span>{" "}
        {suspectedCondition}
      </p>

      <p className="mt-3 text-sm text-gray-700">
        <span className="font-semibold">HPI Summary:</span>
      </p>
      <p className="text-sm text-gray-700">{hpiSummary}</p>


    </div>
  )
}

type CaseData = {
  originalNote?: string;
  aiGeneratedData?: StructuredData;
  userEditedData?: StructuredData;
  fieldSource?: FieldSource;
  chiefComplaint?: string;
  hpiSummary?: string;
  keyFindings?: string[];
  suspectedConditions?: string[];
  dispositionRecommendation?: string;
  uncertainties?: string;
  revisedHpi?: string;
}

const SpecificCaseInfoView = ({
  caseId,
  onBack,
}: {
  caseId: string;
  onBack: () => void;
}) => { 

  const [selectedCase, setSelectedCase] = useState<CaseData>({});
  const [isCaseLoading, setIsCaseLoading] = useState(true);
  const [caseFetchError, setCaseFetchError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastSavedStructured, setLastSavedStructured] = useState<StructuredData | null>(null);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  
  useEffect(() => {
    if (!caseId) {
      setIsCaseLoading(false);
      return;
    }

    const fetchCase = async () => {
      setIsCaseLoading(true);
      setCaseFetchError(false);
      const response = await fetch(`${apiBaseUrl}/api/cases/${caseId}`);

      if (!response.ok) throw new Error("Error fetching case.");

      const data = await response.json();

      const source = hasStructuredContent(data.user_edited_data)
        ? data.user_edited_data
        : data.ai_generated_data ?? {};
      
      setSelectedCase({
        originalNote: data.original_note,
        aiGeneratedData: data.ai_generated_data ?? {},
        userEditedData: data.user_edited_data ?? {},
        fieldSource: data.field_source ?? {},
        chiefComplaint: source.chiefComplaint,
        hpiSummary: source.hpiSummary,
        keyFindings: source.keyFindings,
        suspectedConditions: source.suspectedConditions,
        dispositionRecommendation: source.dispositionRecommendation,
        uncertainties: source.uncertainties,
        revisedHpi: source.revisedHpi,
      });
      setLastSavedStructured(source);
      setSaveError(null);
      setSaveMessage(null);
    };
    fetchCase()
      .catch(() => {
        setCaseFetchError(true);
      })
      .finally(() => {
        setIsCaseLoading(false);
      });
  }, [apiBaseUrl, caseId]);

  const currentStructured = useMemo(
    () => ({
      chiefComplaint: selectedCase.chiefComplaint,
      hpiSummary: selectedCase.hpiSummary,
      keyFindings: selectedCase.keyFindings,
      suspectedConditions: selectedCase.suspectedConditions,
      dispositionRecommendation: selectedCase.dispositionRecommendation,
      uncertainties: selectedCase.uncertainties,
      revisedHpi: selectedCase.revisedHpi,
    }),
    [selectedCase]
  );

  const hasUnsavedEdits = useMemo(() => {
    if (!lastSavedStructured) return false;
    return (
      JSON.stringify(normalizeStructuredData(currentStructured)) !==
      JSON.stringify(normalizeStructuredData(lastSavedStructured))
    );
  }, [currentStructured, lastSavedStructured]);

  const updateStructured = (patch: Partial<StructuredData>) => {
    setSelectedCase((prev) => ({ ...prev, ...patch }));
    setSaveError(null);
    setSaveMessage(null);
  };

  const isAiGeneratedField = (field: StructuredFieldKey) => {
    const aiValue = currentStructured[field];
    const generatedValue = selectedCase.aiGeneratedData?.[field];
    return JSON.stringify(aiValue ?? "") === JSON.stringify(generatedValue ?? "");
  };

  const handleSaveEdits = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_edited_data: currentStructured }),
      });

      if (!response.ok) {
        throw new Error("Failed to save edits.");
      }

      const updated = (await response.json()) as {
        ai_generated_data?: StructuredData;
        user_edited_data?: StructuredData;
        field_source?: FieldSource;
      };

      const source = hasStructuredContent(updated.user_edited_data)
        ? updated.user_edited_data ?? {}
        : updated.ai_generated_data ?? {};

      setSelectedCase((prev) => ({
        ...prev,
        aiGeneratedData: updated.ai_generated_data ?? prev.aiGeneratedData ?? {},
        userEditedData: updated.user_edited_data ?? prev.userEditedData ?? {},
        fieldSource: updated.field_source ?? prev.fieldSource ?? {},
        chiefComplaint: source.chiefComplaint,
        hpiSummary: source.hpiSummary,
        keyFindings: source.keyFindings,
        suspectedConditions: source.suspectedConditions,
        dispositionRecommendation: source.dispositionRecommendation,
        uncertainties: source.uncertainties,
        revisedHpi: source.revisedHpi,
      }));
      setLastSavedStructured(source);
      setSaveMessage("Edits saved.");
    } catch (e) {
      setSaveError("There was an error saving edits.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isCaseLoading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-14 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="mt-4 text-lg font-medium text-gray-700">Loading case details...</p>
        </div>
      </section>
    );
  }

  if (caseFetchError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 px-6 py-14 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-lg font-semibold text-red-700">Error loading case details.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-300"
          >
            <div className="flex cursor-pointer">
              <ArrowLeft size={20} className={"mr-1"}/>
              Back to Saved Cases
            </div>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-300"
        >
          <div className="flex cursor-pointer">
            <ArrowLeft size={20} className={"mr-1"}/>
            Back to Saved Cases
          </div>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-gray-300 bg-gray-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Original Clinical Note</h3>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(selectedCase.originalNote ?? "")
            }
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Copy original note"
          >
            <Copy size={16} className="cursor-pointer"/>
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 text-sm text-gray-700">
          {selectedCase.originalNote ?? ""}
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-gray-50 p-5 shadow-sm">
        <h3 className="mb-4 text-xl font-semibold text-gray-900">Structured Analysis</h3>

        <AiGeneratedField
          label="Chief Complaint"
          value={selectedCase.chiefComplaint ?? ""}
          isAiGenerated={isAiGeneratedField("chiefComplaint")}
          editable
          onChange={(value) => updateStructured({ chiefComplaint: value })}
        />
        <AiGeneratedField
          label="HPI Summary"
          value={selectedCase.hpiSummary ?? ""}
          multiline
          isAiGenerated={isAiGeneratedField("hpiSummary")}
          editable
          onChange={(value) => updateStructured({ hpiSummary: value })}
        />
        <AiGeneratedField
          label="Key Findings"
          value={formatBullets(selectedCase.keyFindings ?? [])}
          multiline
          isAiGenerated={isAiGeneratedField("keyFindings")}
          editable
          onChange={(value) => updateStructured({ keyFindings: parseBullets(value) })}
        />
        <AiGeneratedField
          label="Suspected Condition(s)"
          value={formatBullets(selectedCase.suspectedConditions ?? [])}
          multiline
          isAiGenerated={isAiGeneratedField("suspectedConditions")}
          editable
          onChange={(value) => updateStructured({ suspectedConditions: parseBullets(value) })}
        />
        <AiGeneratedField
          label="Disposition Recommendation"
          value={selectedCase.dispositionRecommendation ?? ""}
          isAiGenerated={isAiGeneratedField("dispositionRecommendation")}
          editable
          onChange={(value) => updateStructured({ dispositionRecommendation: value })}
        />
        <AiGeneratedField
          label="Uncertainties / Missing Information"
          value={selectedCase.uncertainties ?? ""}
          multiline
          isAiGenerated={isAiGeneratedField("uncertainties")}
          editable
          onChange={(value) => updateStructured({ uncertainties: value })}
        />
      </div>

      <div className="rounded-xl border border-gray-300 bg-gray-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-gray-900">Revised HPI</h3>
            <div
              className={`ml-2 flex items-center rounded-2xl p-1 ${
                isAiGeneratedField("revisedHpi") ? "bg-pink-200" : "bg-amber-100"
              }`}
            >
              <BrainCircuit
                size={16}
                color={isAiGeneratedField("revisedHpi") ? "#4c0519" : "#78350f"}
              />
              <span
                className={`ml-1 text-xs font-semibold ${
                  isAiGeneratedField("revisedHpi") ? "text-rose-950" : "text-amber-900"
                }`}
              >
                {isAiGeneratedField("revisedHpi")
                  ? "AI Generated"
                  : "Manually Edited by User"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(selectedCase.revisedHpi ?? "")
            }
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Copy revised HPI"
          >
            <Copy size={16} className="cursor-pointer"/>
          </button>
        </div>
        <textarea
          className="h-72 w-full rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400"
          value={selectedCase.revisedHpi ?? ""}
          onChange={(e) => updateStructured({ revisedHpi: e.target.value })}
        />
      </div>
      </div>
      <div className="mb-2 mt-4 flex items-end justify-end gap-3">
        {saveMessage ? (
          <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
            {saveMessage}
          </p>
        ) : null}
        {saveError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {saveError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSaveEdits}
          disabled={isSaving || !hasUnsavedEdits}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
            isSaving || !hasUnsavedEdits
              ? "cursor-not-allowed bg-gray-300"
              : "cursor-pointer bg-green-600 hover:bg-green-700"
          }`}
        >
          {isSaving ? "Saving..." : "Save Edits"}
        </button>
      </div>
    </section>
  )
}

const AiGeneratedField = ({
  label,
  value,
  multiline = false,
  isAiGenerated = true,
  editable = false,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  isAiGenerated?: boolean;
  editable?: boolean;
  onChange?: (value: string) => void;
}) => {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <div
          className={`ml-2 flex items-center rounded-2xl p-1 ${
            isAiGenerated ? "bg-pink-200" : "bg-amber-100"
          }`}
        >
          <BrainCircuit size={16} color={isAiGenerated ? "#4c0519" : "#78350f"} />
          <span
            className={`ml-1 text-xs font-semibold ${
              isAiGenerated ? "text-rose-950" : "text-amber-900"
            }`}
          >
            {isAiGenerated ? "AI Generated" : "Manually Edited by User"}
          </span>
        </div>
      </div>
      {editable ? (
        <textarea
          className="w-full rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          rows={multiline ? 4 : 2}
        />
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
          {value || (multiline ? "N/A" : "Unknown")}
        </div>
      )}
    </div>
  );
};