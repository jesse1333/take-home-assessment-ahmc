"use client";

import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { ClinicalNotePanel } from "@/components/clinical-note-panel";
import { SavedCasesView } from "@/components/savedCasesView";

type ActiveTab = "new-case" | "saved-cases";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("new-case");
  const savedCasesCount = 0;

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <FileText className="h-9 w-9 text-blue-600" />
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Clinical Note Processor
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("new-case")}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold transition-colors cursor-pointer ${
              activeTab === "new-case"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Plus className="h-5 w-5" />
            <span>New Case</span>
          </button>
          <button
            onClick={() => setActiveTab("saved-cases")}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold transition-colors cursor-pointer ${
              activeTab === "saved-cases"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Saved Cases ({savedCasesCount})
          </button>
        </div>
      </header>

      <div className="mt-8 ml-8 mr-8">
        {activeTab === "new-case" ? <ClinicalNotePanel /> : <SavedCasesView />}
      </div>
    </main>
  );
}
