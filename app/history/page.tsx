import { PageFrame, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function HistoryPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Prompt History"
        description="A local library of saved prompts, versions, and evaluation snapshots."
      />
      <div className="py-10">
        <EmptyState
          title="The library is empty."
          description="Saved prompts and their version history will live here. Local persistence is implemented in the history milestone."
          href="/builder"
          action="Build the first prompt"
        />
      </div>
    </PageFrame>
  );
}
