"use client"
import { Sparkles } from "lucide-react";
import { useState } from "react";
 
export function ClinicalNotePanel() {

  const [note, setNote] = useState("")
  const hasNote = note.trim().length > 0;

  const populateTextArea = () => {
    setNote("72-year-old female with 3 days of fever, right lower quadrant abdominal pain, leukocytosis, CT concerning acute diverticulitis. Failed outpatient antibiotics.")
  }

  return (
    <section className="m-4 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
      <h2 className="text-3xl font-semibold text-gray-900">Enter Clinical Note</h2>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="clinical-note"
          className="block text-sm font-medium text-gray-700"
        >
          Clinical Note
        </label>
        <textarea
          id="clinical-note"
          placeholder="Paste unstructured clinical note here..."
          className="h-40 w-full rounded-xl border border-gray-300 bg-white p-4 text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          disabled={!hasNote}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white
            ${hasNote ? 
              "bg-blue-600 text-white cursor-pointer" 
              :"bg-gray-300 text-white cursor-not-allowed"
            }`}
        >
          <Sparkles className="h-5 w-5" />
          Generate Analysis
        </button>
        <button
          type="button"
          className="rounded-xl bg-gray-200 px-6 py-3 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-300 cursor-pointer"
          onClick={populateTextArea}
        >
          Load Example
        </button>
      </div>
    </section>
  );
}
