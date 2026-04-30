import { CircleAlert } from "lucide-react";

export function SavedCasesView() {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-14 shadow-sm">
      <div className="flex flex-col items-center justify-center text-center">
        <CircleAlert className="h-14 w-14 text-gray-300" />
        <h2 className="mt-6 text-4xl font-semibold text-gray-900">No Cases Yet</h2>
        <p className="mt-3 text-xl text-gray-600">
          Create your first case by entering a clinical note in the "New Case"
          tab.
        </p>
      </div>
    </section>
  );
}
