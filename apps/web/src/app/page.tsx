"use client";

import { FileText, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import NewCaseView from "@/components/new-case-view";
import { SavedCasesView } from "@/components/savedCasesView";
import UploadCaseView from "@/components/upload-case-view";

type ActiveTab = "new-case" | "upload-doc" | "saved-cases";

export default function Home() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const [activeTab, setActiveTab] = useState<ActiveTab>("new-case");
  const [savedCasesCount, setSavedCasesCount] = useState(0);

  useEffect(() => {
    const fetchSavedCasesCount = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/cases`);
        if (!response.ok) return;
        const data = (await response.json()) as unknown[];
        setSavedCasesCount(data.length);
      } catch {
        console.log("Error fetching data.")
      }
    };

    fetchSavedCasesCount();
  }, [apiBaseUrl]);

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
            onClick={() => setActiveTab("upload-doc")}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold transition-colors cursor-pointer ${
              activeTab === "upload-doc"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Upload className="h-5 w-5" />
            <span>Upload Document</span>
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
        {activeTab === "new-case" ? (
          <NewCaseView />
        ) : activeTab === "upload-doc" ? (
          <UploadCaseView onCaseCreated={() => setSavedCasesCount((prev) => prev + 1)} />
        ) : (
          <SavedCasesView onCasesLoaded={(cases) => setSavedCasesCount(cases.length)} />
        )}
      </div>
    </main>
  );
}
